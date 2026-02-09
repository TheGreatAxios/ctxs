pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../amm/interfaces/IBiteSwapV2Pair.sol";
import "../amm/interfaces/IBiteSwapV2Factory.sol";
import "../encryption/BITEPrecompile.sol";
import "./LimitOrderStructs.sol";

contract ConfidentialLimitOrderBook is ReentrancyGuard {
    using LimitOrderStructs for LimitOrderStructs.LimitOrder;

    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InsufficientGasPayment();
    error InsufficientGasBalance();
    error NotYourOrder();
    error OrderInactive();
    error InvalidPool();
    error NotFactory();
    error InvalidOrderData();
    error OrderNotFound();
    error InvalidSignature();
    error TransferFailed();
    error InvalidAmount();
    error SwapExecutionFailed(uint256 orderId, bytes reason);

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    IBiteSwapV2Factory public factory;
    uint256 public constant CTX_GAS_COST = 0.01 ether;

    mapping(address => LimitOrderStructs.LimitOrder[]) public poolOrders;
    mapping(address => uint256) public userNonces;
    mapping(address => uint256) public userGasBalance;
    mapping(address => bool) private _poolLocked; // Per-pool reentrancy lock

    // ═════════════════════════════════════════════════════════════════════════
    // Modifiers
    // ═════════════════════════════════════════════════════════════════════════
    modifier lockPool(address pool) {
        if (_poolLocked[pool]) revert("Pool locked");
        _poolLocked[pool] = true;
        _;
        _poolLocked[pool] = false;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event OrderSubmitted(address indexed maker, address indexed pool, uint256 orderId, uint256 nonce);
    event OrderCancelled(address indexed maker, address indexed pool, uint256 orderId);
    event OrderExpired(address indexed maker, address indexed pool, uint256 orderId);
    event OrderFilled(address indexed maker, address indexed pool, uint256 orderId, uint256 amountOut);
    event SwapFailed(address indexed maker, address indexed pool, uint256 indexed orderId, bytes reason);
    event CTXSubmitted(address indexed pool, uint256 orderId, address ctxSender);
    event BatchCTXSubmitted(address indexed pool, uint256 submittedCount);
    event GasDeposited(address indexed user, uint256 amount);
    event GasWithdrawn(address indexed user, uint256 amount);
    event FactorySet(address indexed factory);

    // ═════════════════════════════════════════════════════════════════════════
    // Constructor
    // ═════════════════════════════════════════════════════════════════════════
    constructor() {}

    // ═════════════════════════════════════════════════════════════════════════
    // Admin
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Set the factory address (only callable once)
    /// @param _factory Address of the AMM factory
    function setFactory(address _factory) external {
        if (address(factory) != address(0)) revert NotFactory();
        if (_factory == address(0)) revert NotFactory();
        factory = IBiteSwapV2Factory(_factory);
        emit FactorySet(_factory);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Gas Management
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Deposit ETH to cover CTX gas costs
    function depositGas() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }

    /// @notice Withdraw unused gas deposit
    /// @param amount Amount to withdraw
    function withdrawGas(uint256 amount) external nonReentrant {
        if (userGasBalance[msg.sender] < amount) revert InsufficientGasBalance();
        userGasBalance[msg.sender] -= amount;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit GasWithdrawn(msg.sender, amount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Order Management
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Submit an encrypted limit order with signed authorization
    /// @param pool AMM pair address
    /// @param encryptedTargetPrice Threshold-encrypted target price
    /// @param encryptedAmount Threshold-encrypted amount
    /// @param direction true = token0→token1, false = token1→token0
    /// @param deadline Expiration timestamp (0 = no expiry)
    /// @param signature Compact vrs signature (bytes65) for authorization
    /// @return orderId Order ID in the pool's order array
    function submitLimitOrder(
        address pool,
        bytes calldata encryptedTargetPrice,
        bytes calldata encryptedAmount,
        bool direction,
        uint256 deadline,
        bytes calldata signature
    ) external payable nonReentrant returns (uint256 orderId) {
        if (msg.value < CTX_GAS_COST) revert InsufficientGasPayment();
        if (!_isValidPool(pool)) revert InvalidPool();
        if (signature.length != 65) revert InvalidSignature();

        // Store gas deposit
        userGasBalance[msg.sender] += msg.value;

        // Create and store order
        uint256 nonce = ++userNonces[msg.sender];
        orderId = poolOrders[pool].length;

        // Create order hash for signature verification (will be used later)
        bytes32 orderHash = keccak256(abi.encode(pool, msg.sender, nonce));

        poolOrders[pool].push(
            LimitOrderStructs.LimitOrder({
                maker: msg.sender,
                pool: pool,
                encryptedTargetPrice: encryptedTargetPrice,
                encryptedAmount: encryptedAmount,
                direction: direction,
                deadline: deadline,
                nonce: nonce,
                active: true,
                gasDeducted: false,
                orderHash: orderHash,
                signature: signature,
                ctxProcessing: false,
                lastProcessedBlock: 0
            })
        );

        emit OrderSubmitted(msg.sender, pool, orderId, nonce);
    }

    /// @notice Cancel an active order and refund gas deposit (if not yet used)
    /// @param pool Pool address
    /// @param orderId Order ID
    function cancelOrder(address pool, uint256 orderId) external nonReentrant {
        LimitOrderStructs.LimitOrder storage order = poolOrders[pool][orderId];
        if (order.maker != msg.sender) revert NotYourOrder();
        if (!order.active) revert OrderInactive();

        order.active = false;

        // Only refund gas if it hasn't been deducted yet (prevent double-spend)
        if (!order.gasDeducted) {
            uint256 refund = CTX_GAS_COST;
            userGasBalance[msg.sender] += refund;
        }

        emit OrderCancelled(msg.sender, pool, orderId);
    }

    /// @notice Get order count for a pool
    /// @param pool Pool address
    /// @return count Number of orders
    function getOrderCount(address pool) external view returns (uint256) {
        return poolOrders[pool].length;
    }

    /// @notice Get order details
    /// @param pool Pool address
    /// @param orderId Order ID
    /// @return order Order details
    function getOrder(address pool, uint256 orderId) external view returns (LimitOrderStructs.LimitOrder memory order) {
        order = poolOrders[pool][orderId];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Order Execution
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Check orders after a swap - submits batch CTX for all processable orders
    /// @dev Called by BiteSwapV2Pair.swap() via the swap hook
    /// @param pool The AMM pair address
    function checkOrders(address pool) external lockPool(pool) {
        if (!_isValidPool(pool)) revert InvalidPool();

        LimitOrderStructs.LimitOrder[] storage orders = poolOrders[pool];
        uint256 ordersLength = orders.length;

        // Collect indices of all processable orders
        uint256[] memory orderIndices = new uint256[](ordersLength);
        uint256 validCount = 0;

        for (uint256 i = 0; i < ordersLength;) {
            if (canProcessOrder(orders[i], pool)) {
                orderIndices[validCount] = i;
                ++validCount;
            }
            unchecked {
                ++i;
            }
        }

        // Submit batch CTX
        uint256 submitted = submitBatchCTX(pool, orders, orderIndices, validCount);

        emit BatchCTXSubmitted(pool, submitted);
    }

    /// @notice Submit batch CTX for multiple orders
    /// @param pool Pool address
    /// @param orders Orders array
    /// @param orderIndices Indices of orders to process
    /// @param indicesCount Number of valid indices
    /// @return submittedCount Number of CTXs submitted
    function submitBatchCTX(
        address pool,
        LimitOrderStructs.LimitOrder[] storage orders,
        uint256[] memory orderIndices,
        uint256 indicesCount
    ) internal returns (uint256 submittedCount) {
        if (indicesCount == 0) return 0;

        // Build batch arrays - max size is indicesCount
        bytes[] memory encryptedArgs = new bytes[](indicesCount * 2);
        bytes[] memory plaintextArgs = new bytes[](indicesCount * 4);
        uint256[] memory indicesToProcess = new uint256[](indicesCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < indicesCount;) {
            uint256 orderIdx = orderIndices[i];
            LimitOrderStructs.LimitOrder storage order = orders[orderIdx];

            if (!canProcessOrder(order, pool)) {
                unchecked {
                    ++i;
                }
                continue;
            }

            // Mark as processing
            markOrderProcessing(order);

            // Encode encrypted data
            encryptedArgs[idx * 2] = order.encryptedTargetPrice;
            encryptedArgs[idx * 2 + 1] = order.encryptedAmount;

            // Encode plaintext data
            plaintextArgs[idx * 4] = abi.encode(order.pool);
            plaintextArgs[idx * 4 + 1] = abi.encode(order.direction);
            plaintextArgs[idx * 4 + 2] = abi.encode(order.maker);
            plaintextArgs[idx * 4 + 3] = abi.encode(order.nonce);

            indicesToProcess[idx] = orderIdx;
            ++idx;
            unchecked {
                ++i;
            }
        }

        if (idx == 0) return 0;

        // Submit batch CTX with higher gas limit (500k per order + buffer)
        uint256 batchGasLimit = 500_000 * idx + 100_000;
        address ctxSender = BITEPrecompile.submitCTX(encryptedArgs, plaintextArgs, batchGasLimit);

        // Deduct gas from all users and fund CTX sender
        uint256 gasCost = CTX_GAS_COST;
        for (uint256 i = 0; i < idx;) {
            LimitOrderStructs.LimitOrder storage order = orders[indicesToProcess[i]];
            userGasBalance[order.maker] -= gasCost;
            order.gasDeducted = true;

            // Fund CTX sender
            (bool success,) = payable(ctxSender).call{value: gasCost}("");
            if (!success) {
                // Refund and revert
                userGasBalance[order.maker] += gasCost;
                order.gasDeducted = false;
                revert TransferFailed();
            }
            unchecked {
                ++i;
            }
        }

        return idx;
    }

    /// @notice BITE V2 callback - called with decrypted batch values
    /// @dev Only callable by BITE V2 system
    /// @param decryptedArgs Decrypted values [targetPrice1, amount1, targetPrice2, amount2, ...]
    /// @param plainArgs Plaintext values [pool1, direction1, maker1, nonce1, pool2, direction2, ...]
    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        uint256 orderCount = decryptedArgs.length / 2; // 2 encrypted values per order
        if (plainArgs.length != orderCount * 4) revert InvalidOrderData();

        for (uint256 i = 0; i < orderCount;) {
            // Decode plaintext args
            address pool = abi.decode(plainArgs[i * 4], (address));
            bool direction = abi.decode(plainArgs[i * 4 + 1], (bool));
            address maker = abi.decode(plainArgs[i * 4 + 2], (address));
            uint256 nonce = abi.decode(plainArgs[i * 4 + 3], (uint256));

            // Decode decrypted args
            uint256 targetPrice = abi.decode(decryptedArgs[i * 2], (uint256));
            uint256 amount = abi.decode(decryptedArgs[i * 2 + 1], (uint256));

            // Process order with error handling
            _processOrderIfValid(pool, maker, nonce, targetPrice, amount, direction);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Process a single order from batch CTX
    /// @param pool Pool address
    /// @param maker Order maker
    /// @param nonce Order nonce
    /// @param targetPrice Decrypted target price
    /// @param amount Decrypted amount
    /// @param direction Swap direction
    /// @return orderFound True if order was found
    /// @return shouldRetry True if order remains active (condition not met or swap failed)
    function _processOrderIfValid(
        address pool,
        address maker,
        uint256 nonce,
        uint256 targetPrice,
        uint256 amount,
        bool direction
    ) internal returns (bool orderFound, bool shouldRetry) {
        // Validate pool
        if (!_isValidPool(pool)) return (false, false);

        // Find order
        LimitOrderStructs.LimitOrder[] storage orders = poolOrders[pool];
        uint256 orderId = _findOrderIndex(orders, maker, nonce);
        if (orderId == type(uint256).max) return (false, false);

        LimitOrderStructs.LimitOrder storage order = orders[orderId];

        // Always clear processing flag (even if inactive or expired)
        clearOrderProcessing(order);

        // Validate order
        if (!order.active) return (true, false);
        if (order.deadline != 0 && block.timestamp >= order.deadline) {
            order.active = false;
            emit OrderExpired(maker, pool, orderId);
            return (true, false);
        }

        // Check price condition (now with decrypted values)
        (bool met, uint256 outputAmount) = _checkPriceCondition(pool, targetPrice, amount, direction);

        if (met) {
            // Execute swap with safe error handling
            (bool success, bytes memory errorData) = _executeSwap(pool, order, outputAmount, direction);

            if (success) {
                order.active = false;
                emit OrderFilled(maker, pool, orderId, outputAmount);
                return (true, false); // Order filled, no retry needed
            } else {
                // Swap failed (slippage, insufficient balance, etc.)
                emit SwapFailed(maker, pool, orderId, errorData);
                return (true, true); // Order still active, may retry
            }
        }

        // Condition not met - order remains active for next swap
        return (true, true); // Order still active, should retry
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Internal Functions
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Check if price condition is met
    /// @param pool Pool address
    /// @param targetPrice Target price
    /// @param amount Input amount
    /// @param direction Swap direction
    /// @return met Whether condition met
    /// @return outputAmount Expected output amount
    function _checkPriceCondition(address pool, uint256 targetPrice, uint256 amount, bool direction)
        internal
        view
        returns (bool met, uint256 outputAmount)
    {
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(pool).getReserves();

        if (direction) {
            // token0 → token1
            outputAmount = _getAmountOut(amount, reserve0, reserve1);
        } else {
            // token1 → token0
            outputAmount = _getAmountOut(amount, reserve1, reserve0);
        }

        met = outputAmount >= targetPrice;
    }

    /// @notice Calculate output amount using x*y=k formula
    /// @param amountIn Input amount
    /// @param reserveIn Input reserve
    /// @param reserveOut Output reserve
    /// @return amountOut Output amount (0.3% fee)
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Execute swap on the pool using fillLimitOrder with stored signature
    /// @dev Uses try/catch to prevent reverts from bubbling up
    /// @param pool Pool address
    /// @param order Order to execute (contains signature)
    /// @param outputAmount Expected output amount
    /// @param direction Swap direction
    /// @return success True if swap succeeded
    /// @return errorData Error data if swap failed
    function _executeSwap(address pool, LimitOrderStructs.LimitOrder memory order, uint256 outputAmount, bool direction)
        internal
        returns (bool success, bytes memory errorData)
    {
        if (outputAmount == 0) revert InvalidAmount();
        if (order.signature.length != 65) revert InvalidSignature();

        // Decode signature from bytes
        bytes32 r;
        bytes32 s;
        uint8 v;
        bytes memory sig = order.signature;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Calculate input amount with some buffer (actual input will be calculated by pair)
        uint256 amountInMax = _getAmountIn(outputAmount, pool, direction);

        if (direction) {
            // token0 → token1: receive token1
            try IBiteSwapV2Pair(pool).fillLimitOrder(0, outputAmount, order.maker, amountInMax, order.nonce, v, r, s) {
                return (true, "");
            } catch Error(string memory reason) {
                return (false, bytes(reason));
            } catch (bytes memory lowLevelData) {
                return (false, lowLevelData);
            }
        } else {
            // token1 → token0: receive token0
            try IBiteSwapV2Pair(pool).fillLimitOrder(outputAmount, 0, order.maker, amountInMax, order.nonce, v, r, s) {
                return (true, "");
            } catch Error(string memory reason) {
                return (false, bytes(reason));
            } catch (bytes memory lowLevelData) {
                return (false, lowLevelData);
            }
        }
    }

    /// @notice Calculate input amount needed for desired output (reverse of getAmountOut)
    /// @param amountOut Desired output amount
    /// @param pool Pool address
    /// @param direction Swap direction
    /// @return amountIn Maximum input amount (with buffer)
    function _getAmountIn(uint256 amountOut, address pool, bool direction) internal view returns (uint256 amountIn) {
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(pool).getReserves();

        uint256 reserveIn;
        uint256 reserveOut;

        if (direction) {
            // token0 → token1: receiving token1, need token0
            reserveIn = reserve0;
            reserveOut = reserve1;
        } else {
            // token1 → token0: receiving token0, need token1
            reserveIn = reserve1;
            reserveOut = reserve0;
        }

        // Reverse formula: amountIn = (amountOut * reserveIn * 1000) / ((reserveOut - amountOut) * 997)
        // Add 10% buffer for slippage
        amountIn = (amountOut * reserveIn * 1000) / ((reserveOut - amountOut) * 997);
        amountIn = (amountIn * 110) / 100; // 10% buffer
    }

    /// @notice Verify address is a valid pool from our factory
    /// @param pool Address to check
    /// @return valid True if valid pool
    function _isValidPool(address pool) internal view returns (bool valid) {
        if (pool == address(0)) return false;
        if (address(factory) == address(0)) return false; // Require factory to be set

        try IBiteSwapV2Pair(pool).token0() returns (address token0) {
            address token1 = IBiteSwapV2Pair(pool).token1();
            return factory.getPair(token0, token1) == pool;
        } catch {
            return false;
        }
    }

    /// @notice Find order index by maker and nonce
    /// @param orders Orders array to search
    /// @param maker Order maker address
    /// @param nonce Order nonce
    /// @return orderId Order index or type(uint256).max if not found
    function _findOrderIndex(LimitOrderStructs.LimitOrder[] storage orders, address maker, uint256 nonce)
        internal
        view
        returns (uint256 orderId)
    {
        for (uint256 i = 0; i < orders.length; ++i) {
            if (orders[i].maker == maker && orders[i].nonce == nonce) {
                return i;
            }
        }
        return type(uint256).max;
    }

    /// @notice Check if order can be processed (pre-flight validation)
    /// @param order Order to check
    /// @param pool Pool address for liquidity check
    /// @return canProcess True if order is eligible for CTX submission
    function canProcessOrder(LimitOrderStructs.LimitOrder storage order, address pool)
        internal
        view
        returns (bool canProcess)
    {
        // Basic status checks
        if (!order.active) return false;
        if (order.ctxProcessing) return false; // Already has CTX pending
        if (order.deadline != 0 && block.timestamp >= order.deadline) return false;
        if (userGasBalance[order.maker] < CTX_GAS_COST) return false;

        // Pre-CTX check: Verify pool has liquidity for this order direction
        (uint112 reserve0, uint112 reserve1,) = IBiteSwapV2Pair(pool).getReserves();

        if (order.direction) {
            // token0 → token1: need reserve1 (output) to have liquidity
            if (reserve1 == 0) return false;
            if (reserve0 < 1000) return false; // Need minimum input liquidity
        } else {
            // token1 → token0: need reserve0 (output) to have liquidity
            if (reserve0 == 0) return false;
            if (reserve1 < 1000) return false; // Need minimum input liquidity
        }

        return true;
    }

    /// @notice Mark order as being processed (CTX submitted)
    /// @param order Order to mark
    function markOrderProcessing(LimitOrderStructs.LimitOrder storage order) internal {
        order.ctxProcessing = true;
        order.lastProcessedBlock = block.number;
    }

    /// @notice Clear order processing flag (CTX executed or failed)
    /// @param order Order to clear
    function clearOrderProcessing(LimitOrderStructs.LimitOrder storage order) internal {
        order.ctxProcessing = false;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
