// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MyToken
 * @dev ERC-20 Token with additional features:
 * - Minting capability (owner only)
 * - Burning capability
 * - Pausable transfers (owner only)
 * - ERC20Permit for gasless approvals
 */
contract MyToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    bool private _paused;
    
    event Paused(address account);
    event Unpaused(address account);

    /**
     * @dev Constructor that gives msg.sender all of initial supply
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply (in tokens, not wei)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _paused = false;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused
     */
    modifier whenNotPaused() {
        require(!_paused, "Token transfers are paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused
     */
    modifier whenPaused() {
        require(_paused, "Token transfers are not paused");
        _;
    }

    /**
     * @dev Returns true if the contract is paused
     */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
     * @dev Triggers paused state
     */
    function pause() public onlyOwner whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Returns to normal state
     */
    function unpause() public onlyOwner whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint (in tokens, not wei)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10 ** decimals());
    }

    /**
     * @dev Override transfer function to add pause functionality
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }

    /**
     * @dev Override transferFrom function to add pause functionality
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        whenNotPaused
        returns (bool)
    {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Get balance in human-readable format (with decimals)
     */
    function balanceOfReadable(address account) public view returns (uint256) {
        return balanceOf(account) / 10 ** decimals();
    }
}