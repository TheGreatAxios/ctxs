// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSKL is ERC20 {
    constructor() ERC20("SKL Token", "SKL") {
        // Mint 1,000,000 tokens to deployer
        _mint(msg.sender, 1_000_000 * 10**18);
        _mint(0xC1789D08713C6aBaeF63db72607a95f4A5D14058, 1_000_000 * 10**18);
        _mint(0x7cdADd0f6DcCb2971a3Ed89dC096c26aC626CF76, 1_000_000 * 10**18);
    }
}
