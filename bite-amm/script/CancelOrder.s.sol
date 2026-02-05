pragma solidity 0.8.24;

import "forge-std/Script.sol";

interface ILOB {
    function cancelOrder(address pool, uint256 orderId) external;
}

contract CancelOrder is Script {
    address constant LOB = 0x8d413a5e31F311d1f85be177D658cF468325C88c;
    address constant USDC_WETH_PAIR = 0x8fEeae69CD6f48F46C07dE1e7bbEb788a01d2978;
    uint256 constant ORDER_ID = 0;

    function run() external {
        uint256 deployerPrivKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivKey);

        ILOB lob = ILOB(LOB);

        console.log("Cancelling order", ORDER_ID);
        lob.cancelOrder(USDC_WETH_PAIR, ORDER_ID);
        console.log("Order cancelled successfully");

        vm.stopBroadcast();
    }
}
