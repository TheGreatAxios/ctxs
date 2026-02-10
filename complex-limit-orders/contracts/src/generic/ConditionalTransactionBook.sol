pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "../encryption/Precompiled.sol";
import "../conditions/IConditionChecker.sol";
import "../conditions/ConditionTypes.sol";
import "../actions/IActionExecutor.sol";
import "../actions/ActionTypes.sol";

/// @notice Generic conditional transaction book supporting pluggable conditions and actions
contract ConditionalTransactionBook is ReentrancyGuard {
    using ConditionTypes for ConditionTypes.Condition;
    using ActionTypes for ActionTypes.Action;

    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InsufficientGasPayment();
    error InsufficientGasBalance();
    error CheckerNotRegistered();
    error ExecutorNotRegistered();
    error InvalidConditionalTx();
    error ConditionFailed();
    error ActionFailed();
    error TransferFailed();
    error Unauthorized();

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    uint256 public constant CTX_GAS_COST = 0.006 ether; // 600k gas per order at 10 gwei

    // Registered condition checkers and action executors
    mapping(address => bool) public registeredCheckers;
    mapping(address => bool) public registeredExecutors;

    // User gas balances
    mapping(address => uint256) public userGasBalance;

    // Conditional transactions
    // Each checker+executor pair can have multiple conditional transactions
    mapping(address => mapping(address => ConditionalTx[])) public conditionalTxs;

    // Nonce for each submitter to prevent replay
    mapping(address => uint256) public userNonces;

    // ═════════════════════════════════════════════════════════════════════════
    // Structs
    // ═════════════════════════════════════════════════════════════════════════
    struct ConditionalTx {
        address submitter; // User who submitted
        address conditionChecker; // Checker to validate condition
        address actionExecutor; // Executor to perform action
        bytes encryptedValue; // Encrypted threshold value
        bytes conditionData; // Additional condition parameters
        bytes actionData; // Action parameters
        uint256 nonce; // User nonce
        uint256 deadline; // Expiration (0 = none)
        bool active; // Status
        bool gasDeducted; // Gas spent
        bool ctxProcessing; // CTX submitted, awaiting execution
        uint256 lastProcessedBlock; // Last processing block
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event CheckerRegistered(address indexed checker, address indexed registrar);
    event CheckerUnregistered(address indexed checker);
    event ExecutorRegistered(address indexed executor, address indexed registrar);
    event ExecutorUnregistered(address indexed executor);
    event ConditionalTxSubmitted(
        address indexed submitter, address indexed checker, address indexed executor, uint256 txId, uint256 nonce
    );
    event ConditionalTxCancelled(address indexed submitter, uint256 txId);
    event ConditionalTxExecuted(address indexed submitter, uint256 txId, bool conditionMet, bool actionSucceeded);
    event BatchCTXSubmitted(uint256 submittedCount);
    event GasDeposited(address indexed user, uint256 amount);
    event GasWithdrawn(address indexed user, uint256 amount);

    // ═════════════════════════════════════════════════════════════════════════
    // Admin
    // ═════════════════════════════════════════════════════════════════════════
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /// @notice Register a condition checker
    function registerChecker(address checker) external onlyOwner {
        registeredCheckers[checker] = true;
        emit CheckerRegistered(checker, msg.sender);
    }

    /// @notice Unregister a condition checker
    function unregisterChecker(address checker) external onlyOwner {
        registeredCheckers[checker] = false;
        emit CheckerUnregistered(checker);
    }

    /// @notice Register an action executor
    function registerExecutor(address executor) external onlyOwner {
        registeredExecutors[executor] = true;
        emit ExecutorRegistered(executor, msg.sender);
    }

    /// @notice Unregister an action executor
    function unregisterExecutor(address executor) external onlyOwner {
        registeredExecutors[executor] = false;
        emit ExecutorUnregistered(executor);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert Unauthorized();
        owner = newOwner;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Gas Management
    // ═════════════════════════════════════════════════════════════════════════
    function depositGas() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }

    function withdrawGas(uint256 amount) external nonReentrant {
        if (userGasBalance[msg.sender] < amount) revert InsufficientGasBalance();
        userGasBalance[msg.sender] -= amount;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit GasWithdrawn(msg.sender, amount);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Conditional Transaction Submission
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Submit a conditional transaction
    /// @param conditionChecker Address of registered condition checker
    /// @param actionExecutor Address of registered action executor
    /// @param encryptedValue Encrypted threshold value (BITE encryptTE)
    /// @param conditionData Additional condition parameters
    /// @param actionData Action parameters
    /// @param deadline Expiration timestamp (0 = no expiry)
    /// @return txId Transaction ID
    function submitConditionalTx(
        address conditionChecker,
        address actionExecutor,
        bytes calldata encryptedValue,
        bytes calldata conditionData,
        bytes calldata actionData,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 txId) {
        if (msg.value < CTX_GAS_COST) revert InsufficientGasPayment();
        if (!registeredCheckers[conditionChecker]) revert CheckerNotRegistered();
        if (!registeredExecutors[actionExecutor]) revert ExecutorNotRegistered();

        // Store gas deposit
        userGasBalance[msg.sender] += msg.value;

        // Create transaction
        uint256 nonce = ++userNonces[msg.sender];
        txId = conditionalTxs[conditionChecker][actionExecutor].length;

        conditionalTxs[conditionChecker][actionExecutor].push(
            ConditionalTx({
                submitter: msg.sender,
                conditionChecker: conditionChecker,
                actionExecutor: actionExecutor,
                encryptedValue: encryptedValue,
                conditionData: conditionData,
                actionData: actionData,
                nonce: nonce,
                deadline: deadline,
                active: true,
                gasDeducted: false,
                ctxProcessing: false,
                lastProcessedBlock: 0
            })
        );

        emit ConditionalTxSubmitted(msg.sender, conditionChecker, actionExecutor, txId, nonce);
    }

    /// @notice Cancel a conditional transaction
    function cancelConditionalTx(address checker, address executor, uint256 txId) external nonReentrant {
        ConditionalTx storage ctx = conditionalTxs[checker][executor][txId];
        if (ctx.submitter != msg.sender) revert Unauthorized();
        if (!ctx.active) revert InvalidConditionalTx();

        ctx.active = false;

        // Refund gas if not deducted
        if (!ctx.gasDeducted) {
            userGasBalance[msg.sender] += CTX_GAS_COST;
        }

        emit ConditionalTxCancelled(msg.sender, txId);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Trigger & Batch Processing
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Check and trigger all conditional transactions for a checker-executor pair
    /// @dev Anyone can call this to trigger batch CTX submission
    function checkConditionalTxs(address checker, address executor) external nonReentrant {
        if (!registeredCheckers[checker]) revert CheckerNotRegistered();
        if (!registeredExecutors[executor]) revert ExecutorNotRegistered();

        ConditionalTx[] storage txs = conditionalTxs[checker][executor];
        uint256 txCount = txs.length;

        // Collect indices of processable transactions
        uint256[] memory txIndices = new uint256[](txCount);
        uint256 validCount = 0;

        for (uint256 i = 0; i < txCount;) {
            if (_canProcessTx(txs[i])) {
                txIndices[validCount] = i;
                ++validCount;
            }
            unchecked {
                ++i;
            }
        }

        // Submit batch CTX
        uint256 submitted = _submitBatchCTX(checker, executor, txs, txIndices, validCount);
        emit BatchCTXSubmitted(submitted);
    }

    /// @notice Check if transaction can be processed
    function _canProcessTx(ConditionalTx storage ctx) internal view returns (bool) {
        if (!ctx.active) return false;
        if (ctx.ctxProcessing) return false;
        if (ctx.deadline != 0 && block.timestamp >= ctx.deadline) return false;
        if (userGasBalance[ctx.submitter] < CTX_GAS_COST) return false;
        return true;
    }

    /// @notice Submit batch CTX for multiple transactions
    function _submitBatchCTX(
        address checker,
        address executor,
        ConditionalTx[] storage txs,
        uint256[] memory txIndices,
        uint256 indicesCount
    ) internal returns (uint256 submittedCount) {
        if (indicesCount == 0) return 0;

        // Build batch arrays
        (bytes[] memory encryptedArgs, bytes[] memory plaintextArgs, uint256[] memory indicesToProcess, uint256 count) =
            _buildCtxBatchArrays(checker, executor, txs, txIndices, indicesCount);

        if (count == 0) return 0;

        // Submit CTX
        uint256 batchGasLimit = 500_000 * count + 100_000;
        address payable ctxSender = Precompiled.submitCTX(address(0x1B), batchGasLimit, abi.encode(encryptedArgs), abi.encode(plaintextArgs));

        // Fund CTX sender
        _fundCtxTxs(txs, indicesToProcess, count, ctxSender);
        return count;
    }

    /// @notice Build batch arrays for CTX submission
    function _buildCtxBatchArrays(
        address checker,
        address executor,
        ConditionalTx[] storage txs,
        uint256[] memory txIndices,
        uint256 indicesCount
    ) internal view returns (
        bytes[] memory encryptedArgs,
        bytes[] memory plaintextArgs,
        uint256[] memory indicesToProcess,
        uint256 count
    ) {
        encryptedArgs = new bytes[](indicesCount);
        plaintextArgs = new bytes[](indicesCount * 4);
        indicesToProcess = new uint256[](indicesCount);
        count = 0;

        for (uint256 i = 0; i < indicesCount;) {
            uint256 txIdx = txIndices[i];
            ConditionalTx storage ctx = txs[txIdx];

            if (!_canProcessTx(ctx)) {
                unchecked { ++i; }
                continue;
            }

            uint256 pos = count;
            encryptedArgs[pos] = ctx.encryptedValue;
            plaintextArgs[pos * 4] = abi.encode(checker);
            plaintextArgs[pos * 4 + 1] = abi.encode(executor);
            plaintextArgs[pos * 4 + 2] = abi.encode(ctx.submitter);
            plaintextArgs[pos * 4 + 3] = abi.encode(ctx.nonce);
            indicesToProcess[pos] = txIdx;

            unchecked { ++count; ++i; }
        }
    }

    /// @notice Fund CTX sender and mark transactions
    function _fundCtxTxs(
        ConditionalTx[] storage txs,
        uint256[] memory indicesToProcess,
        uint256 count,
        address ctxSender
    ) internal {
        uint256 gasCost = CTX_GAS_COST;

        for (uint256 i = 0; i < count;) {
            ConditionalTx storage ctx = txs[indicesToProcess[i]];
            ctx.ctxProcessing = true;
            ctx.lastProcessedBlock = block.number;
            userGasBalance[ctx.submitter] -= gasCost;
            ctx.gasDeducted = true;

            (bool sent,) = payable(ctxSender).call{value: gasCost}("");
            if (!sent) {
                userGasBalance[ctx.submitter] += gasCost;
                ctx.gasDeducted = false;
                ctx.ctxProcessing = false;
                revert TransferFailed();
            }
            unchecked { ++i; }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BITE V2 Callback
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice BITE V2 callback with decrypted values
    /// @dev Only callable by BITE V2 system (next block execution)
    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external {
        uint256 txCount = decryptedArgs.length;
        if (plainArgs.length != txCount * 4) revert InvalidConditionalTx();

        for (uint256 i = 0; i < txCount;) {
            _processSingleCtx(decryptedArgs, plainArgs, i);
            unchecked { ++i; }
        }
    }

    /// @notice Process single CTX from callback
    function _processSingleCtx(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs, uint256 i) internal {
        address checker = abi.decode(plainArgs[i * 4], (address));
        address executor = abi.decode(plainArgs[i * 4 + 1], (address));
        address submitter = abi.decode(plainArgs[i * 4 + 2], (address));
        uint256 nonce = abi.decode(plainArgs[i * 4 + 3], (uint256));
        uint256 decryptedValue = abi.decode(decryptedArgs[i], (uint256));

        _processTx(checker, executor, submitter, nonce, decryptedValue);
    }

    /// @notice Process a single conditional transaction
    function _processTx(address checker, address executor, address submitter, uint256 nonce, uint256 decryptedValue)
        internal
    {
        ConditionalTx[] storage txs = conditionalTxs[checker][executor];
        uint256 txId = _findTxIndex(txs, submitter, nonce);
        if (txId == type(uint256).max) return;

        ConditionalTx storage ctx = txs[txId];
        ctx.ctxProcessing = false;

        if (!_validateTx(ctx, submitter, txId)) return;

        // Check and execute conditionally
        (bool met, bytes memory context) = IConditionChecker(checker).checkCondition(ctx.conditionData, decryptedValue);
        if (!met) {
            emit ConditionalTxExecuted(submitter, txId, false, false);
            return;
        }

        (bool success,) = IActionExecutor(executor).executeAction(ctx.actionData, context);
        if (success) ctx.active = false;

        emit ConditionalTxExecuted(submitter, txId, true, success);
    }

    /// @notice Validate transaction is active and not expired
    function _validateTx(ConditionalTx storage ctx, address submitter, uint256 txId) internal returns (bool) {
        if (!ctx.active) return false;
        if (ctx.deadline != 0 && block.timestamp >= ctx.deadline) {
            ctx.active = false;
            return false;
        }
        return true;
    }

    /// @notice Find transaction index by submitter and nonce
    function _findTxIndex(ConditionalTx[] storage txs, address submitter, uint256 nonce)
        internal
        view
        returns (uint256 txId)
    {
        for (uint256 i = 0; i < txs.length; ++i) {
            if (txs[i].submitter == submitter && txs[i].nonce == nonce) {
                return i;
            }
        }
        return type(uint256).max;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Get transaction count for a checker-executor pair
    function getTxCount(address checker, address executor) external view returns (uint256) {
        return conditionalTxs[checker][executor].length;
    }

    /// @notice Get transaction details
    function getTx(address checker, address executor, uint256 txId) external view returns (ConditionalTx memory) {
        return conditionalTxs[checker][executor][txId];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {
        userGasBalance[msg.sender] += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
