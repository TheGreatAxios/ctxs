pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../encryption/BITEPrecompile.sol";
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
    uint256 public constant CTX_GAS_COST = 0.01 ether;

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
        ConditionalTx storage tx = conditionalTxs[checker][executor][txId];
        if (tx.submitter != msg.sender) revert Unauthorized();
        if (!tx.active) revert InvalidConditionalTx();

        tx.active = false;

        // Refund gas if not deducted
        if (!tx.gasDeducted) {
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
    function _canProcessTx(ConditionalTx storage tx) internal view returns (bool) {
        if (!tx.active) return false;
        if (tx.ctxProcessing) return false;
        if (tx.deadline != 0 && block.timestamp >= tx.deadline) return false;
        if (userGasBalance[tx.submitter] < CTX_GAS_COST) return false;
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

        bytes[] memory encryptedArgs = new bytes[](indicesCount);
        bytes[] memory plaintextArgs = new bytes[](indicesCount * 4);
        uint256[] memory indicesToProcess = new uint256[](indicesCount);

        uint256 idx = 0;
        for (uint256 i = 0; i < indicesCount;) {
            uint256 txIdx = txIndices[i];
            ConditionalTx storage tx = txs[txIdx];

            if (!_canProcessTx(tx)) {
                unchecked {
                    ++i;
                }
                continue;
            }

            // Mark as processing
            tx.ctxProcessing = true;
            tx.lastProcessedBlock = block.number;

            // Encode encrypted value
            encryptedArgs[idx] = tx.encryptedValue;

            // Encode plaintext data
            plaintextArgs[idx * 4] = abi.encode(checker);
            plaintextArgs[idx * 4 + 1] = abi.encode(executor);
            plaintextArgs[idx * 4 + 2] = abi.encode(tx.submitter);
            plaintextArgs[idx * 4 + 3] = abi.encode(tx.nonce);

            indicesToProcess[idx] = txIdx;
            ++idx;
            unchecked {
                ++i;
            }
        }

        if (idx == 0) return 0;

        // Submit batch CTX
        uint256 batchGasLimit = 500_000 * idx + 100_000;
        address ctxSender = BITEPrecompile.submitCTX(encryptedArgs, plaintextArgs, batchGasLimit);

        // Deduct gas and fund CTX sender
        uint256 gasCost = CTX_GAS_COST;
        for (uint256 i = 0; i < idx;) {
            ConditionalTx storage tx = txs[indicesToProcess[i]];
            userGasBalance[tx.submitter] -= gasCost;
            tx.gasDeducted = true;

            (bool success,) = payable(ctxSender).call{value: gasCost}("");
            if (!success) {
                userGasBalance[tx.submitter] += gasCost;
                tx.gasDeducted = false;
                revert TransferFailed();
            }
            unchecked {
                ++i;
            }
        }

        return idx;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BITE V2 Callback
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice BITE V2 callback with decrypted values
    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external nonReentrant {
        uint256 txCount = decryptedArgs.length;
        if (plainArgs.length != txCount * 4) revert InvalidConditionalTx();

        for (uint256 i = 0; i < txCount;) {
            // Decode plaintext args
            address checker = abi.decode(plainArgs[i * 4], (address));
            address executor = abi.decode(plainArgs[i * 4 + 1], (address));
            address submitter = abi.decode(plainArgs[i * 4 + 2], (address));
            uint256 nonce = abi.decode(plainArgs[i * 4 + 3], (uint256));

            // Decode decrypted value
            uint256 decryptedValue = abi.decode(decryptedArgs[i], (uint256));

            // Process transaction
            _processTx(checker, executor, submitter, nonce, decryptedValue);

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Process a single conditional transaction
    function _processTx(address checker, address executor, address submitter, uint256 nonce, uint256 decryptedValue)
        internal
    {
        // Find transaction
        ConditionalTx[] storage txs = conditionalTxs[checker][executor];
        uint256 txId = _findTxIndex(txs, submitter, nonce);
        if (txId == type(uint256).max) return;

        ConditionalTx storage tx = txs[txId];

        // Clear processing flag
        tx.ctxProcessing = false;

        // Validate transaction
        if (!tx.active) return;
        if (tx.deadline != 0 && block.timestamp >= tx.deadline) {
            tx.active = false;
            return;
        }

        // Check condition
        (bool conditionMet, bytes memory context) =
            IConditionChecker(checker).checkCondition(tx.conditionData, decryptedValue);

        if (!conditionMet) {
            emit ConditionalTxExecuted(submitter, txId, false, false);
            return;
        }

        // Execute action
        (bool success, bytes memory result) = IActionExecutor(executor).executeAction(tx.actionData, context);

        if (success) {
            tx.active = false;
        }

        emit ConditionalTxExecuted(submitter, txId, true, success);
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
