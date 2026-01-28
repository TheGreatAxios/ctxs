pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    error MintingNotAllowed();

    bool public immutable ALLOW_MINTING;
    uint8 public immutable DECIMALS;

    /// @notice Constructor for mock token
    /// @param name Token name
    /// @param symbol Token symbol
    /// @param _allowMinting Whether to allow minting after deployment
    /// @param _decimals Token decimals (default 18)
    constructor(string memory name, string memory symbol, bool _allowMinting, uint8 _decimals) ERC20(name, symbol) {
        ALLOW_MINTING = _allowMinting;
        DECIMALS = _decimals;
        _mint(msg.sender, 1_000_000 * 10 ** _decimals);
    }

    function decimals() public view override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Mint additional tokens (only if enabled)
    /// @param to Recipient address
    /// @param amount Amount to mint
    function mint(address to, uint256 amount) external {
        if (!ALLOW_MINTING) revert MintingNotAllowed();
        _mint(to, amount);
    }
}
