// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyToken.sol";

/**
 * @title TokenFactory
 * @dev Factory contract that allows anyone to deploy their own ERC-20 tokens
 * Each token is a separate MyToken contract with customizable parameters
 */
contract TokenFactory {
    // Array to store all deployed token addresses
    address[] public deployedTokens;
    
    // Mapping from creator address to their deployed tokens
    mapping(address => address[]) public creatorToTokens;
    
    // Mapping from token address to token info
    mapping(address => TokenInfo) public tokenInfo;
    
    // Struct to store token metadata
    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 deployedAt;
    }
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 timestamp
    );
    
    /**
     * @dev Create a new ERC-20 token
     * @param name Token name (e.g., "My Token")
     * @param symbol Token symbol (e.g., "MTK")
     * @param initialSupply Initial supply in tokens (will be multiplied by 10^18)
     * @return tokenAddress Address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) external returns (address tokenAddress) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(initialSupply > 0, "Initial supply must be greater than 0");
        
        // Deploy new MyToken contract
        // The msg.sender will be set as the owner of the new token
        MyToken newToken = new MyToken(name, symbol, initialSupply);
        
        // Transfer ownership to the creator
        newToken.transferOwnership(msg.sender);
        
        tokenAddress = address(newToken);
        
        // Store token information
        TokenInfo memory info = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            initialSupply: initialSupply,
            deployedAt: block.timestamp
        });
        
        tokenInfo[tokenAddress] = info;
        deployedTokens.push(tokenAddress);
        creatorToTokens[msg.sender].push(tokenAddress);
        
        emit TokenCreated(
            tokenAddress,
            msg.sender,
            name,
            symbol,
            initialSupply,
            block.timestamp
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Get total number of tokens deployed
     */
    function getTotalTokensDeployed() external view returns (uint256) {
        return deployedTokens.length;
    }
    
    /**
     * @dev Get all deployed token addresses
     */
    function getAllDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }
    
    /**
     * @dev Get tokens created by a specific address
     */
    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return creatorToTokens[creator];
    }
    
    /**
     * @dev Get detailed information about a token
     */
    function getTokenInfo(address tokenAddress) external view returns (
        address creator,
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 deployedAt,
        uint256 currentSupply,
        address owner
    ) {
        TokenInfo memory info = tokenInfo[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        
        MyToken token = MyToken(tokenAddress);
        
        return (
            info.creator,
            info.name,
            info.symbol,
            info.initialSupply,
            info.deployedAt,
            token.totalSupply(),
            token.owner()
        );
    }
    
    /**
     * @dev Get paginated list of deployed tokens
     * @param startIndex Starting index
     * @param count Number of tokens to return
     */
    function getDeployedTokensPaginated(uint256 startIndex, uint256 count) 
        external 
        view 
        returns (address[] memory) 
    {
        require(startIndex < deployedTokens.length, "Start index out of bounds");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > deployedTokens.length) {
            endIndex = deployedTokens.length;
        }
        
        uint256 resultLength = endIndex - startIndex;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = deployedTokens[startIndex + i];
        }
        
        return result;
    }
    
    /**
     * @dev Get the latest N tokens deployed
     * @param count Number of latest tokens to return
     */
    function getLatestTokens(uint256 count) external view returns (address[] memory) {
        uint256 totalTokens = deployedTokens.length;
        require(totalTokens > 0, "No tokens deployed yet");
        
        uint256 resultLength = count > totalTokens ? totalTokens : count;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = deployedTokens[totalTokens - 1 - i];
        }
        
        return result;
    }
}