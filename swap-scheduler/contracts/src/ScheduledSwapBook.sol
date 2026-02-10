pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./amm/interfaces/IBiteSwapV2Pair.sol";
import { Precompiled } from "./encryption/Precompiled.sol";

/// @notice ScheduledSwapBook - Price-triggered AMM swap scheduler using BITE threshold encryption
contract ScheduledSwapBook {
    /// @notice Errors
    error InsufficientGas();
    error InvalidPool();
    error InvalidDeadline();
    error SwapNotFound();
    error SwapNotActive();
    error OnlyBitePrecompile();
    error DecryptionFailed();
    error SwapExecutionFailed();
    error NotSubmitter();
    error InvalidAmount();
    error InvalidPrice();
    error PriceNotMet();

    /// @notice Struct representing a scheduled swap
    struct ScheduledSwap {
        address submitter; // User who submitted the swap
        address pool; // AMM pair address
        bytes encryptedAmount; // BITE encryptTE encrypted amount
        bytes encryptedTargetPrice; // BITE encryptTE encrypted target price
        bool direction; // true=token0→token1, false=token1→token0
        uint256 nonce; // User's nonce for replay protection
        uint256 deadline; // Expiration timestamp
        bool active; // Whether the swap is still active
    }

    /// @notice Events
    event ScheduledSwapSubmitted(
        address indexed submitter, address indexed pool, uint256 indexed swapId, bool direction, uint256 deadline
    );
    event ScheduledSwapCancelled(address indexed submitter, address indexed pool, uint256 indexed swapId);
    event PriceUpdated(address indexed pool, uint256 price);
    event SwapsChecked(address indexed pool, uint256 swapsSubmitted);
    event SwapExecuted(
        address indexed pool, uint256 indexed swapId, address indexed submitter, uint256 amountIn, uint256 amountOut
    );
    event SwapFailed(address indexed pool, uint256 indexed swapId, string reason);

    /// @notice State
    mapping(address => ScheduledSwap[]) public poolSwaps; // pool -> swaps
    mapping(address => uint256) public userNonces; // user -> current nonce
    mapping(address => uint256) public userGasBalance; // user -> deposited gas balance
    mapping(address => uint256) public currentPrice; // pool -> current price (mock oracle)

    uint256 public constant CTX_GAS_COST = 0.01 ether;
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant CTX_GAS_LIMIT = 10_000_000; // 10M gas for CTX execution

    // Track CTX sender addresses for access control
    mapping(address => bool) public isCtxSender;

    /// @notice Submit a scheduled swap with encrypted parameters
    /// @param pool AMM pair address
    /// @param encryptedAmount Encrypted swap amount (BITE encryptTE)
    /// @param encryptedTargetPrice Encrypted target price (BITE encryptTE)
    /// @param direction true=token0→token1, false=token1→token0
    /// @param deadline Unix timestamp when order expires
    function submitScheduledSwap(
        address pool,
        bytes calldata encryptedAmount,
        bytes calldata encryptedTargetPrice,
        bool direction,
        uint256 deadline
    ) external payable {
        if (msg.value < CTX_GAS_COST) revert InsufficientGas();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (pool == address(0)) revert InvalidPool();

        uint256 nonce = userNonces[msg.sender]++;

        // Store gas deposit
        userGasBalance[msg.sender] += msg.value;

        // Create scheduled swap
        ScheduledSwap memory newSwap = ScheduledSwap({
            submitter: msg.sender,
            pool: pool,
            encryptedAmount: encryptedAmount,
            encryptedTargetPrice: encryptedTargetPrice,
            direction: direction,
            nonce: nonce,
            deadline: deadline,
            active: true
        });

        poolSwaps[pool].push(newSwap);

        emit ScheduledSwapSubmitted(msg.sender, pool, poolSwaps[pool].length - 1, direction, deadline);
    }

    /// @notice Cancel a scheduled swap
    /// @param pool AMM pair address
    /// @param swapId Index of swap in poolSwaps array
    function cancelSwap(address pool, uint256 swapId) external {
        if (swapId >= poolSwaps[pool].length) revert SwapNotFound();
        ScheduledSwap storage swap = poolSwaps[pool][swapId];
        if (!swap.active) revert SwapNotActive();
        if (swap.submitter != msg.sender) revert NotSubmitter();

        swap.active = false;

        // Refund gas deposit
        uint256 refund = CTX_GAS_COST;
        if (userGasBalance[msg.sender] >= refund) {
            userGasBalance[msg.sender] -= refund;
            payable(msg.sender).transfer(refund);
        }

        emit ScheduledSwapCancelled(msg.sender, pool, swapId);
    }

    /// @notice Set/update price for a pool (mock oracle - permissionless)
    /// @param pool AMM pair address
    /// @param price New price (token1/token0 * PRICE_PRECISION)
    function setPrice(address pool, uint256 price) external {
        if (pool == address(0)) revert InvalidPool();
        if (price == 0) revert InvalidPrice();

        currentPrice[pool] = price;
        emit PriceUpdated(pool, price);
    }

    /// @notice Check all scheduled swaps for a pool (permissionless trigger)
    /// @param pool AMM pair address
    function checkSwaps(address pool) external {
        if (pool == address(0)) revert InvalidPool();

        ScheduledSwap[] memory swaps = poolSwaps[pool];
        if (swaps.length == 0) return;

        // Count active swaps
        uint256 activeCount = 0;
        for (uint256 i = 0; i < swaps.length; i++) {
            if (swaps[i].active && swaps[i].deadline > block.timestamp) {
                activeCount++;
            }
        }

        if (activeCount == 0) return;

        emit SwapsChecked(pool, activeCount);

        // Collect swap data
        address[] memory pools = new address[](activeCount);
        uint256[] memory swapIds = new uint256[](activeCount);
        address[] memory submitters = new address[](activeCount);
        bool[] memory directions = new bool[](activeCount);
        bytes[] memory encryptedArgs = new bytes[](activeCount * 2);

        uint256 idx = 0;
        for (uint256 i = 0; i < swaps.length; i++) {
            if (swaps[i].active && swaps[i].deadline > block.timestamp) {
                pools[idx] = pool;
                swapIds[idx] = i;
                submitters[idx] = swaps[i].submitter;
                directions[idx] = swaps[i].direction;
                encryptedArgs[idx * 2] = swaps[i].encryptedAmount;
                encryptedArgs[idx * 2 + 1] = swaps[i].encryptedTargetPrice;
                idx++;
            }
        }

        // Encode all plaintext args into a single bytes
        bytes memory plaintextData = abi.encode(pools, swapIds, submitters, directions);
        bytes[] memory plaintextArgs = new bytes[](1);
        plaintextArgs[0] = plaintextData;

        address payable ctxSender = Precompiled.submitCTX(address(0x1B), CTX_GAS_LIMIT, abi.encode(encryptedArgs), abi.encode(plaintextArgs));

        // Track CTX sender for access control
        isCtxSender[ctxSender] = true;

        // Transfer gas to CTX sender
        uint256 totalGas = activeCount * CTX_GAS_COST;
        if (totalGas > 0 && address(this).balance >= totalGas) {
            payable(ctxSender).transfer(totalGas);
        }
    }

    /// @notice BITE callback - receives decrypted values and executes swaps
    /// @param decryptedArgs Decrypted [amount, targetPrice, amount, targetPrice, ...]
    /// @param plainArgs Plaintext encoded values
    function onDecrypt(uint256[] calldata decryptedArgs, bytes calldata plainArgs) external {
        // Verify this came from a valid CTX sender address
        if (!isCtxSender[msg.sender]) revert OnlyBitePrecompile();

        // Clean up the CTX sender flag to prevent reuse
        isCtxSender[msg.sender] = false;

        uint256 swapCount = decryptedArgs.length / 2;
        if (swapCount == 0) revert DecryptionFailed();

        // Decode plainArgs which contains (pool, swapId, submitter, direction) for each swap
        (address[] memory pools, uint256[] memory swapIds, address[] memory submitters, bool[] memory directions) =
            abi.decode(plainArgs, (address[], uint256[], address[], bool[]));

        if (pools.length != swapCount) revert DecryptionFailed();

        for (uint256 i = 0; i < swapCount; i++) {
            uint256 amount = decryptedArgs[i * 2];
            uint256 targetPrice = decryptedArgs[i * 2 + 1];

            address pool = pools[i];
            uint256 swapId = swapIds[i];
            address submitter = submitters[i];
            bool direction = directions[i];

            // Verify swap still exists and is active
            if (swapId >= poolSwaps[pool].length) continue;
            ScheduledSwap storage swap = poolSwaps[pool][swapId];
            if (!swap.active || swap.deadline <= block.timestamp) continue;

            // Check if price condition is met
            uint256 current = currentPrice[pool];
            bool priceMet = direction
                ? current >= targetPrice  // token0→token1: need higher price
                : current <= targetPrice; // token1→token0: need lower price

            if (!priceMet) {
                emit SwapFailed(pool, swapId, "Price not met");
                continue;
            }

            // Execute swap
            try this.executeSwap(pool, submitter, amount, direction) {
                swap.active = false;
                emit SwapExecuted(pool, swapId, submitter, amount, 0);
            } catch {
                emit SwapFailed(pool, swapId, "Execution failed");
            }
        }
    }

    /// @notice Internal swap execution
    /// @param pool AMM pair address
    /// @param submitter User whose tokens will be used
    /// @param amount Input amount
    /// @param direction Swap direction
    function executeSwap(address pool, address submitter, uint256 amount, bool direction) external {
        // Only allow self-call from onDecrypt
        if (msg.sender != address(this)) revert OnlyBitePrecompile();

        IBiteSwapV2Pair pair = IBiteSwapV2Pair(pool);
        address token0 = pair.token0();
        address token1 = pair.token1();

        // Get current reserves to calculate output
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        uint256 amount0Out;
        uint256 amount1Out;

        if (direction) {
            // token0 → token1: sell token0, receive token1
            amount0Out = 0;
            // Calculate output: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
            uint256 amountInWithFee = amount * 997;
            uint256 numerator = amountInWithFee * uint256(reserve1);
            uint256 denominator = (uint256(reserve0) * 1000) + amountInWithFee;
            amount1Out = numerator / denominator;
        } else {
            // token1 → token0: sell token1, receive token0
            uint256 amountInWithFee = amount * 997;
            uint256 numerator = amountInWithFee * uint256(reserve0);
            uint256 denominator = (uint256(reserve1) * 1000) + amountInWithFee;
            amount0Out = numerator / denominator;
            amount1Out = 0;
        }

        // Pull tokens from submitter
        if (direction) {
            IERC20(token0).transferFrom(submitter, pool, amount);
        } else {
            IERC20(token1).transferFrom(submitter, pool, amount);
        }

        // Execute swap
        pair.swap(amount0Out, amount1Out, submitter, "");
    }

    /// @notice Get all scheduled swaps for a pool
    /// @param pool AMM pair address
    /// @return swaps Array of ScheduledSwap structs
    function getSwaps(address pool) external view returns (ScheduledSwap[] memory swaps) {
        return poolSwaps[pool];
    }

    /// @notice Get active swap count for a pool
    /// @param pool AMM pair address
    /// @return count Number of active swaps
    function getActiveSwapCount(address pool) external view returns (uint256 count) {
        ScheduledSwap[] memory swaps = poolSwaps[pool];
        for (uint256 i = 0; i < swaps.length; i++) {
            if (swaps[i].active && swaps[i].deadline > block.timestamp) {
                count++;
            }
        }
    }

    /// @notice Receive ETH for gas funding
    receive() external payable {}
}
