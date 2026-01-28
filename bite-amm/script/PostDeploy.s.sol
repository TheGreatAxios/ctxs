pragma solidity 0.8.24;

import "forge-std/Script.sol";

/// @notice Script to save deployment addresses to a JSON file for reuse
/// @dev Run this after Deploy.s.sol to create deployed_addresses.json
contract PostDeploy is Script {
    struct DeploymentAddresses {
        address factory;
        address router;
        address lob;
        address usdc;
        address usdt;
        address weth;
        address wbtc;
        address usdcWethPair;
        address usdcWbtcPair;
        address usdtWethPair;
        address usdtWbtcPair;
        address wethWbtcPair;
    }

    function run(
        address factory,
        address router,
        address lob,
        address usdc,
        address usdt,
        address weth,
        address wbtc,
        address usdcWethPair,
        address usdcWbtcPair,
        address usdtWethPair,
        address usdtWbtcPair,
        address wethWbtcPair
    ) external {
        DeploymentAddresses memory addresses = DeploymentAddresses({
            factory: factory,
            router: router,
            lob: lob,
            usdc: usdc,
            usdt: usdt,
            weth: weth,
            wbtc: wbtc,
            usdcWethPair: usdcWethPair,
            usdcWbtcPair: usdcWbtcPair,
            usdtWethPair: usdtWethPair,
            usdtWbtcPair: usdtWbtcPair,
            wethWbtcPair: wethWbtcPair
        });

        string memory json = _toJson(addresses);
        vm.writeFile("./deployed_addresses.json", json);

        console.log("=== Deployment Addresses Saved ===");
        console.log(json);
    }

    function _toJson(DeploymentAddresses memory addresses) internal pure returns (string memory) {
        return string.concat(
            "{\n",
            '  "FACTORY": "',
            _addrToStr(addresses.factory),
            '",\n',
            '  "ROUTER": "',
            _addrToStr(addresses.router),
            '",\n',
            '  "LOB": "',
            _addrToStr(addresses.lob),
            '",\n',
            '  "USDC": "',
            _addrToStr(addresses.usdc),
            '",\n',
            '  "USDT": "',
            _addrToStr(addresses.usdt),
            '",\n',
            '  "WETH": "',
            _addrToStr(addresses.weth),
            '",\n',
            '  "WBTC": "',
            _addrToStr(addresses.wbtc),
            '",\n',
            '  "USDC_WETH_PAIR": "',
            _addrToStr(addresses.usdcWethPair),
            '",\n',
            '  "USDC_WBTC_PAIR": "',
            _addrToStr(addresses.usdcWbtcPair),
            '",\n',
            '  "USDT_WETH_PAIR": "',
            _addrToStr(addresses.usdtWethPair),
            '",\n',
            '  "USDT_WBTC_PAIR": "',
            _addrToStr(addresses.usdtWbtcPair),
            '",\n',
            '  "WETH_WBTC_PAIR": "',
            _addrToStr(addresses.wethWbtcPair),
            '"\n',
            "}"
        );
    }

    function _addrToStr(address addr) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
