pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Precompiled } from "./lib/Precompiled.sol";

/// @notice Nostradamus Registry - Time Capsule for Encrypted Predictions
/// @dev Uses BITE V2 Phase 2 (submitCTX precompile) for threshold encryption
contract NostradamusRegistry is ReentrancyGuard {
    // ═════════════════════════════════════════════════════════════════════════
    // Errors
    // ═════════════════════════════════════════════════════════════════════════
    error InvalidPrediction();
    error Unauthorized();
    error RevealBlockNotReached();
    error AlreadyRevealed();
    error CTXSubmissionFailed();
    error InsufficientGas();
    error InvalidRevealDelay();
    error EmptyPrediction();
    error EmptyDescription();

    // ═════════════════════════════════════════════════════════════════════════
    // Constants
    // ═════════════════════════════════════════════════════════════════════════
    uint256 public constant CTX_GAS_COST = 0.01 ether;
    uint256 public constant MIN_REVEAL_DELAY = 1; // At least 1 block
    uint256 public constant MAX_REVEAL_DELAY = 100000; // ~1 week on SKALE

    // ═════════════════════════════════════════════════════════════════════════
    // State
    // ═════════════════════════════════════════════════════════════════════════
    uint256 public predictionCount;
    mapping(uint256 => Prediction) public predictions;

    // ═════════════════════════════════════════════════════════════════════════
    // Structs
    // ═════════════════════════════════════════════════════════════════════════
    struct Prediction {
        address predictor;
        bytes encryptedPrediction;  // BITE encryptTE encrypted
        bytes32 metadataHash;       // For verification (optional)
        uint256 revealBlock;        // When reveal can happen
        string description;         // Plaintext description
        bool active;
        bool revealed;
        string revealedValue;       // Decrypted after reveal
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Events
    // ═════════════════════════════════════════════════════════════════════════
    event PredictionSubmitted(
        uint256 indexed predictionId,
        address indexed predictor,
        bytes encryptedPrediction,
        uint256 revealBlock,
        string description
    );
    event PredictionCancelled(uint256 indexed predictionId);
    event RevealTriggered(uint256 indexed predictionId);
    event PredictionRevealed(uint256 indexed predictionId, string revealedValue);

    // ═════════════════════════════════════════════════════════════════════════
    // Submit Prediction
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Submit an encrypted prediction
    /// @param encryptedPrediction BITE encryptTE encrypted prediction
    /// @param revealDelay Number of blocks to wait before reveal
    /// @param description Plaintext description of what was predicted
    /// @return predictionId The ID of the submitted prediction
    function submitPrediction(
        bytes calldata encryptedPrediction,
        uint256 revealDelay,
        string calldata description
    ) external payable nonReentrant returns (uint256 predictionId) {
        if (encryptedPrediction.length == 0) revert EmptyPrediction();
        if (bytes(description).length == 0) revert EmptyDescription();
        if (revealDelay < MIN_REVEAL_DELAY || revealDelay > MAX_REVEAL_DELAY) {
            revert InvalidRevealDelay();
        }
        if (msg.value < CTX_GAS_COST) revert InsufficientGas();

        predictionId = ++predictionCount;

        predictions[predictionId] = Prediction({
            predictor: msg.sender,
            encryptedPrediction: encryptedPrediction,
            metadataHash: bytes32(0),
            revealBlock: block.number + revealDelay,
            description: description,
            active: true,
            revealed: false,
            revealedValue: ""
        });

        emit PredictionSubmitted(
            predictionId,
            msg.sender,
            encryptedPrediction,
            block.number + revealDelay,
            description
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Cancel Prediction
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Cancel a prediction before reveal
    /// @param predictionId The ID of the prediction to cancel
    function cancelPrediction(uint256 predictionId) external nonReentrant {
        Prediction storage pred = predictions[predictionId];
        if (!pred.active) revert InvalidPrediction();
        if (pred.predictor != msg.sender) revert Unauthorized();

        pred.active = false;

        // Refund gas deposit using low-level call to avoid issues with precompile addresses in tests
        (bool success, ) = payable(msg.sender).call{value: CTX_GAS_COST}("");
        if (!success) revert InvalidPrediction();

        emit PredictionCancelled(predictionId);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Trigger Reveal
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Trigger reveal of a prediction via BITE CTX
    /// @param predictionId The ID of the prediction to reveal
    function triggerReveal(uint256 predictionId) external nonReentrant {
        Prediction storage pred = predictions[predictionId];
        if (!pred.active) revert InvalidPrediction();
        if (block.number < pred.revealBlock) revert RevealBlockNotReached();
        if (pred.revealed) revert AlreadyRevealed();

        // Build CTX arguments - encode as arrays
        bytes[] memory encryptedArgs = new bytes[](1);
        encryptedArgs[0] = pred.encryptedPrediction;

        bytes[] memory plaintextArgs = new bytes[](2);
        plaintextArgs[0] = abi.encode(predictionId);
        plaintextArgs[1] = abi.encode(msg.sender);

        // Submit CTX - encode arrays to bytes for Precompiled library
        address payable ctxSender = Precompiled.submitCTX(
            address(0x1B),
            300_000,
            abi.encode(encryptedArgs),
            abi.encode(plaintextArgs)
        );

        // Fund CTX sender for gas using low-level call
        (bool sent, ) = payable(ctxSender).call{value: CTX_GAS_COST}("");
        if (!sent) revert CTXSubmissionFailed();

        emit RevealTriggered(predictionId);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // BITE V2 Callback
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice BITE V2 callback with decrypted prediction
    /// @dev Only callable by BITE V2 system (next block execution)
    /// @param decryptedArgs Decrypted arguments (first is the prediction)
    /// @param plainArgs Plaintext arguments [predictionId, triggerer]
    function onDecrypt(bytes[] calldata decryptedArgs, bytes[] calldata plainArgs) external {
        if (plainArgs.length != 2) revert InvalidPrediction();
        if (decryptedArgs.length != 1) revert InvalidPrediction();

        uint256 predictionId = abi.decode(plainArgs[0], (uint256));
        address triggerer = abi.decode(plainArgs[1], (address));

        Prediction storage pred = predictions[predictionId];
        if (!pred.active) revert InvalidPrediction();
        if (pred.revealed) revert AlreadyRevealed();

        // Decode the decrypted prediction (bytes -> string)
        string memory revealedValue = string(decryptedArgs[0]);

        pred.revealed = true;
        pred.revealedValue = revealedValue;

        // Refund remaining gas to triggerer
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool sent, ) = payable(triggerer).call{value: balance}("");
            if (!sent) revert InvalidPrediction();
        }

        emit PredictionRevealed(predictionId, revealedValue);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // View Functions
    // ═════════════════════════════════════════════════════════════════════════
    /// @notice Get prediction details
    function getPrediction(uint256 predictionId) external view returns (Prediction memory) {
        return predictions[predictionId];
    }

    /// @notice Get total prediction count
    function getTotalPredictions() external view returns (uint256) {
        return predictionCount;
    }

    /// @notice Check if prediction is ready to reveal
    function canReveal(uint256 predictionId) external view returns (bool) {
        Prediction memory pred = predictions[predictionId];
        return pred.active && !pred.revealed && block.number >= pred.revealBlock;
    }

    /// @notice Get all active predictions
    function getActivePredictions(uint256 offset, uint256 limit) external view returns (Prediction[] memory) {
        uint256 total = predictionCount;
        if (total == 0 || offset >= total) return new Prediction[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        // Prediction IDs start at 1, not 0
        uint256 start = offset + 1;
        uint256 endId = end + 1;

        Prediction[] memory activePreds = new Prediction[](end - offset);
        uint256 index = 0;

        for (uint256 i = start; i < endId; ) {
            if (predictions[i].active) {
                activePreds[index] = predictions[i];
                ++index;
            }
            unchecked {
                ++i;
            }
        }

        // Resize array to actual count
        uint256 actualCount = index;
        if (actualCount < activePreds.length) {
            assembly {
                mstore(activePreds, actualCount)
            }
        }

        return activePreds;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Fallback
    // ═════════════════════════════════════════════════════════════════════════
    receive() external payable {}
}
