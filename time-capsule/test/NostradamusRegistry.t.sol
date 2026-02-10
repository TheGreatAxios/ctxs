pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/NostradamusRegistry.sol";

contract NostradamusRegistryTest is Test {
    NostradamusRegistry public registry;
    address public predictor;
    address public triggerer;

    uint256 constant CTX_GAS_COST = 0.01 ether;
    bytes constant ENCRYPTED_PREDICTION = hex"1234567890abcdef";

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

    function setUp() public {
        registry = new NostradamusRegistry();
        predictor = address(0x1);
        triggerer = address(0x2);
        vm.deal(predictor, 10 ether);
        vm.deal(triggerer, 1 ether);
    }

    function testSubmitPrediction() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        assertEq(predictionId, 1);

        NostradamusRegistry.Prediction memory pred = registry.getPrediction(predictionId);
        assertEq(pred.predictor, predictor);
        assertEq(pred.encryptedPrediction, ENCRYPTED_PREDICTION);
        assertEq(pred.revealBlock, block.number + 100);
        assertEq(pred.description, "BTC will hit 100k");
        assertTrue(pred.active);
        assertFalse(pred.revealed);
    }

    function testSubmitPredictionEmitsEvent() public {
        vm.prank(predictor);
        vm.expectEmit(true, true, true, true);
        emit PredictionSubmitted(
            1,
            predictor,
            ENCRYPTED_PREDICTION,
            block.number + 100,
            "BTC will hit 100k"
        );
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );
    }

    function testSubmitPredictionFailsWithEmptyPrediction() public {
        vm.prank(predictor);
        vm.expectRevert(NostradamusRegistry.EmptyPrediction.selector);
        registry.submitPrediction{value: CTX_GAS_COST}(
            "",
            100,
            "BTC will hit 100k"
        );
    }

    function testSubmitPredictionFailsWithEmptyDescription() public {
        vm.prank(predictor);
        vm.expectRevert(NostradamusRegistry.EmptyDescription.selector);
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            ""
        );
    }

    function testSubmitPredictionFailsWithInvalidRevealDelay() public {
        vm.prank(predictor);
        vm.expectRevert(NostradamusRegistry.InvalidRevealDelay.selector);
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            0,
            "BTC will hit 100k"
        );
    }

    function testSubmitPredictionFailsWithInsufficientGas() public {
        vm.prank(predictor);
        vm.expectRevert(NostradamusRegistry.InsufficientGas.selector);
        registry.submitPrediction{value: 0}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );
    }

    function testCancelPrediction() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        uint256 balanceBefore = predictor.balance;
        vm.prank(predictor);
        registry.cancelPrediction(predictionId);

        NostradamusRegistry.Prediction memory pred = registry.getPrediction(predictionId);
        assertFalse(pred.active);
        assertEq(predictor.balance, balanceBefore + CTX_GAS_COST);
    }

    function testCancelPredictionEmitsEvent() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        vm.prank(predictor);
        vm.expectEmit(true, false, false, false);
        emit PredictionCancelled(predictionId);
        registry.cancelPrediction(predictionId);
    }

    function testCancelPredictionFailsWhenNotOwner() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        vm.prank(triggerer);
        vm.expectRevert(NostradamusRegistry.Unauthorized.selector);
        registry.cancelPrediction(predictionId);
    }

    function testTriggerRevealFailsBeforeRevealBlock() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        vm.prank(triggerer);
        vm.expectRevert(NostradamusRegistry.RevealBlockNotReached.selector);
        registry.triggerReveal(predictionId);
    }

    function testTriggerRevealFailsWhenAlreadyRevealed() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        // Fast forward past reveal block
        vm.roll(block.number + 101);

        // Simulate reveal by calling onDecrypt directly
        bytes[] memory decryptedArgs = new bytes[](1);
        decryptedArgs[0] = bytes("BTC hits 100k!");

        bytes[] memory plainArgs = new bytes[](2);
        plainArgs[0] = abi.encode(predictionId);
        plainArgs[1] = abi.encode(triggerer);

        registry.onDecrypt(decryptedArgs, plainArgs);

        // Now try to reveal again - should fail with AlreadyRevealed
        vm.prank(triggerer);
        vm.expectRevert(NostradamusRegistry.AlreadyRevealed.selector);
        registry.triggerReveal(predictionId);
    }

    function testCanReveal() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "BTC will hit 100k"
        );

        assertFalse(registry.canReveal(predictionId));

        vm.roll(block.number + 100);
        assertTrue(registry.canReveal(predictionId));
    }

    function testOnDecrypt() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            10,
            "BTC will hit 100k"
        );

        vm.roll(block.number + 11);

        NostradamusRegistry.Prediction memory predBefore = registry.getPrediction(predictionId);
        assertFalse(predBefore.revealed);

        // Mock the onDecrypt call (this would normally be called by BITE system)
        bytes[] memory decryptedArgs = new bytes[](1);
        decryptedArgs[0] = bytes("BTC hits 100k by 2025!");

        bytes[] memory plainArgs = new bytes[](2);
        plainArgs[0] = abi.encode(predictionId);
        plainArgs[1] = abi.encode(triggerer);

        // Fund contract to refund triggerer
        vm.deal(address(registry), CTX_GAS_COST);
        uint256 triggererBalanceBefore = triggerer.balance;

        registry.onDecrypt(decryptedArgs, plainArgs);

        NostradamusRegistry.Prediction memory predAfter = registry.getPrediction(predictionId);
        assertTrue(predAfter.revealed);
        assertEq(predAfter.revealedValue, "BTC hits 100k by 2025!");
        assertEq(triggerer.balance, triggererBalanceBefore + CTX_GAS_COST);
    }

    function testOnDecryptEmitsEvent() public {
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            10,
            "BTC will hit 100k"
        );

        vm.roll(block.number + 11);

        bytes[] memory decryptedArgs = new bytes[](1);
        decryptedArgs[0] = bytes("BTC hits 100k by 2025!");

        bytes[] memory plainArgs = new bytes[](2);
        plainArgs[0] = abi.encode(predictionId);
        plainArgs[1] = abi.encode(triggerer);

        vm.expectEmit(true, false, false, true);
        emit PredictionRevealed(predictionId, "BTC hits 100k by 2025!");
        registry.onDecrypt(decryptedArgs, plainArgs);
    }

    function testGetTotalPredictions() public {
        assertEq(registry.getTotalPredictions(), 0);

        vm.prank(predictor);
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "First prediction"
        );

        assertEq(registry.getTotalPredictions(), 1);

        vm.prank(predictor);
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "Second prediction"
        );

        assertEq(registry.getTotalPredictions(), 2);
    }

    function testGetActivePredictions() public {
        vm.prank(predictor);
        registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            100,
            "Active prediction"
        );

        NostradamusRegistry.Prediction[] memory active = registry.getActivePredictions(0, 10);
        assertEq(active.length, 1);
        assertEq(active[0].description, "Active prediction");
    }

    function testFuzzRevealDelay(uint256 delay) public {
        // Test that valid delays work
        vm.assume(delay >= 1 && delay <= 100000);
        vm.prank(predictor);
        uint256 predictionId = registry.submitPrediction{value: CTX_GAS_COST}(
            ENCRYPTED_PREDICTION,
            delay,
            "Test"
        );

        NostradamusRegistry.Prediction memory pred = registry.getPrediction(predictionId);
        assertEq(pred.revealBlock, block.number + delay);
    }
}
