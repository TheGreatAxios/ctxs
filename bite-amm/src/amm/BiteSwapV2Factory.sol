pragma solidity 0.8.24;

import "./interfaces/IBiteSwapV2Factory.sol";
import "./BiteSwapV2Pair.sol";

contract BiteSwapV2Factory is IBiteSwapV2Factory {
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();
    error NotAuthorized();

    address public override limitOrderBook;
    bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(type(BiteSwapV2Pair).creationCode);

    mapping(address => mapping(address => address)) public override getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    constructor() {}

    /// @notice Get the number of pairs created
    /// @return Number of pairs
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /// @notice Create a new trading pair
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pair Address of the newly created pair
    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        if (getPair[token0][token1] != address(0)) revert PairExists();

        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pair = address(new BiteSwapV2Pair{salt: salt}());

        BiteSwapV2Pair(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /// @notice Set the limit order book address
    /// @param _limitOrderBook Address of the limit order book
    /// @dev Only callable once by anyone, then only by current LOB
    function setLimitOrderBook(address _limitOrderBook) external override {
        if (limitOrderBook == address(0)) {
            // First set - anyone can call (for initial setup)
            if (_limitOrderBook == address(0)) revert NotAuthorized();
        } else {
            // Subsequent sets - only current LOB can change
            if (msg.sender != limitOrderBook) revert NotAuthorized();
        }
        limitOrderBook = _limitOrderBook;
    }

    /// @notice Calculate pair address deterministically
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pair Predicted pair address
    function calculatePairAddress(address tokenA, address tokenB) external view returns (address pair) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        pair = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff", address(this), keccak256(abi.encodePacked(token0, token1)), INIT_CODE_PAIR_HASH
                        )
                    )
                )
            )
        );
    }
}
