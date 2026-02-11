pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IBiteSwapV2Pair.sol";
import "./interfaces/IBiteSwapV2Factory.sol";
import "./interfaces/ILimitOrderBook.sol";

contract BiteSwapV2Pair is IBiteSwapV2Pair, ERC20, ReentrancyGuard {
    error InsufficientLiquidity();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error InvalidTo();
    error K();
    error NotFactory();
    error AlreadyInitialized();
    error Overflow();
    error InvalidSignature();
    error SignerMismatch();
    error InvalidAmount();
    error SlippageExceeded();

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event LimitOrderFilled(
        address indexed signer, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out
    );
    event Sync(uint112 reserve0, uint112 reserve1);
    event SwapHookCalled(address indexed pair);

    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    bool private locked;
    mapping(address => uint256) public nonces;

    modifier lock() {
        if (locked) revert("Reentrancy: swap in progress");
        locked = true;
        _;
        locked = false;
    }

    constructor() ERC20("BiteSwap V2 LP", "BLP") {
        factory = msg.sender;
    }

    /// @notice Initialize the pair with tokens
    /// @param _token0 First token address
    /// @param _token1 Second token address
    function initialize(address _token0, address _token1) external {
        if (msg.sender != factory) revert NotFactory();
        if (token0 != address(0) || token1 != address(0)) revert AlreadyInitialized();

        token0 = _token0;
        token1 = _token1;
    }

    /// @notice Get current reserves
    /// @return _reserve0 Current reserve of token0
    /// @return _reserve1 Current reserve of token1
    /// @return _blockTimestampLast Timestamp of last update
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /// @notice Update reserves and price accumulators
    function _update(uint256 balance0, uint256 balance1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert Overflow();

        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            price0CumulativeLast += uint256(reserve1) * timeElapsed;
            price1CumulativeLast += uint256(reserve0) * timeElapsed;
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }

    /// @notice Calculate output amount for swap
    /// @param amountIn Input amount
    /// @param reserveIn Reserve of input token
    /// @param reserveOut Reserve of output token
    /// @return amountOut Output amount
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Mint liquidity tokens
    /// @param to Recipient address
    /// @return liquidity Amount of liquidity tokens minted
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            liquidity = min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        if (liquidity == 0) revert InsufficientLiquidity();
        _mint(to, liquidity);

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Burn liquidity tokens
    /// @param to Recipient address
    /// @return amount0 Amount of token0 returned
    /// @return amount1 Amount of token1 returned
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();

        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));

        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        _safeTransfer(token0, to, amount0);
        _safeTransfer(token1, to, amount1);

        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Execute a swap
    /// @param amount0Out Amount of token0 to receive
    /// @param amount1Out Amount of token1 to receive
    /// @param to Recipient address
    /// @param data Optional callback data
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external lock nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        if (to == token0 || to == token1) revert InvalidTo();

        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (_reserve0 <= amount0Out || _reserve1 <= amount1Out) revert InsufficientLiquidity();

        uint256 balance0;
        uint256 balance1;

        {
            address _token0 = token0;
            address _token1 = token1;

            if (amount0Out > 0) {
                _safeTransfer(_token0, to, amount0Out);
            }
            if (amount1Out > 0) {
                _safeTransfer(_token1, to, amount1Out);
            }

            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;

        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

        {
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * 1000000) revert K();
        }

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);

        // Trigger limit order check after swap completes
        _checkLimitOrders();
    }

    /// @notice Execute a swap with signed authorization from user (limit order fill)
    /// @dev Verifies signature, pulls tokens from signer, executes swap
    /// @param amount0Out Amount of token0 to receive
    /// @param amount1Out Amount of token1 to receive
    /// @param to Recipient address (must match signer for security)
    /// @param amountInMax Maximum input amount to pull from signer
    /// @param nonce Custom nonce for signature verification (from order)
    /// @param v Signature v component
    /// @param r Signature r component
    /// @param s Signature s component
    /// @return amountIn Actual input amount pulled from signer
    function fillLimitOrder(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        uint256 amountInMax,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external lock nonReentrant returns (uint256 amountIn) {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        if (to == token0 || to == token1) revert InvalidTo();

        // Verify signature
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encode(address(this), amount0Out, amount1Out, to, amountInMax, nonce))
            )
        );
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        if (signer != to) revert SignerMismatch();

        amountIn = _fillLimitOrderInternal(amount0Out, amount1Out, to, amountInMax, signer);
    }

    /// @notice Internal fillLimitOrder logic (separate to reduce stack depth)
    function _fillLimitOrderInternal(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        uint256 amountInMax,
        address signer
    ) internal returns (uint256 amountIn) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (_reserve0 <= amount0Out || _reserve1 <= amount1Out) revert InsufficientLiquidity();

        // Transfer outputs
        _transferOutputs(amount0Out, amount1Out, to);

        // Calculate inputs
        (uint256 balance0, uint256 balance1, uint256 amount0In, uint256 amount1In) =
            _calculateInputAmounts(amount0Out, amount1Out, _reserve0, _reserve1);

        amountIn = amount0In + amount1In;
        if (amountIn == 0) revert InsufficientInputAmount();
        if (amountIn > amountInMax) revert SlippageExceeded();

        // Pull inputs and verify k
        _pullInputsAndVerify(amount0In, amount1In, signer, _reserve0, _reserve1, balance0, balance1);

        _update(balance0 + amount0In, balance1 + amount1In);
        _emitLimitOrderEvents(signer, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /// @notice Transfer output tokens to recipient
    function _transferOutputs(uint256 amount0Out, uint256 amount1Out, address to) internal {
        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);
    }

    /// @notice Calculate input amounts after output transfer
    function _calculateInputAmounts(uint256 amount0Out, uint256 amount1Out, uint112 _reserve0, uint112 _reserve1)
        internal
        view
        returns (uint256 balance0, uint256 balance1, uint256 amount0In, uint256 amount1In)
    {
        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));
        amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
    }

    /// @notice Pull input tokens and verify k constraint
    function _pullInputsAndVerify(
        uint256 amount0In,
        uint256 amount1In,
        address signer,
        uint112 _reserve0,
        uint112 _reserve1,
        uint256 balance0,
        uint256 balance1
    ) internal {
        if (amount0In > 0) _safeTransferFrom(token0, signer, address(this), amount0In);
        if (amount1In > 0) _safeTransferFrom(token1, signer, address(this), amount1In);

        uint256 balance0Final = IERC20(token0).balanceOf(address(this));
        uint256 balance1Final = IERC20(token1).balanceOf(address(this));
        uint256 balance0Adjusted = (balance0Final * 1000) - (amount0In * 3);
        uint256 balance1Adjusted = (balance1Final * 1000) - (amount1In * 3);

        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * 1000000) revert K();
    }

    /// @notice Emit events for limit order fill (separate to reduce stack depth)
    function _emitLimitOrderEvents(
        address signer,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address to
    ) internal {
        emit Swap(signer, amount0In, amount1In, amount0Out, amount1Out, to);
        emit LimitOrderFilled(signer, amount0In, amount1In, amount0Out, amount1Out);
    }

    /// @notice Swap hook callback - triggers limit order check
    /// @dev Called after swap completes internally
    /// @dev Failures in checkOrders should not revert the swap
    function _checkLimitOrders() internal {
        address lob = IBiteSwapV2Factory(factory).limitOrderBook();
        if (lob != address(0)) {
            try ILimitOrderBook(lob).checkOrders(address(this)) {
                emit SwapHookCalled(address(this));
            } catch {
                // Silently fail - limit order book errors should not break swaps
                emit SwapHookCalled(address(this));
            }
        }
    }

    /// @notice Sync reserves to current balances
    function sync() external nonReentrant {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)));
    }

    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, value));
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert("Transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) private {
        (bool success, bytes memory data) =
            token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, value));
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) revert("TransferFrom failed");
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    function _sqrt(uint256 x) private pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
