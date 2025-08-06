// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Individual Influencer Token Contract
contract InfluencerToken is ERC20, Ownable {
    string public influencerName;
    address public influencerWallet;
    address public treasury;
    address public platform;
    uint256 public launchTime;
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _influencerName,
        address _influencerWallet,
        address _treasury,
        address _platform,
        uint256 _totalSupply
    ) ERC20(_name, _symbol) Ownable(_platform) {  // Fixed: Pass initial owner to Ownable
        influencerName = _influencerName;
        influencerWallet = _influencerWallet;
        treasury = _treasury;
        platform = _platform;
        launchTime = block.timestamp;
        
        // Allocate tokens according to the specified distribution
        uint256 influencerAmount = (_totalSupply * 30) / 100; // 30%
        uint256 treasuryAmount = (_totalSupply * 65) / 100;   // 65%
        uint256 platformAmount = (_totalSupply * 5) / 100;    // 5%
        
        _mint(_influencerWallet, influencerAmount);
        _mint(_treasury, treasuryAmount);
        _mint(_platform, platformAmount);
    }
}

// Main Token Factory Contract
contract TokenFactory is Ownable, ReentrancyGuard {
    // Factory configuration
    address public treasury;
    address public platform;
    uint256 public creationFee;
    
    // Array to store all created tokens
    address[] public allTokens;
    
    // Mapping to track token creator
    mapping(address => address) public tokenCreator;
    
    // Events
    event TokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        string influencerName,
        address indexed influencerWallet,
        uint256 totalSupply,
        address indexed creator
    );
    
    event FactoryConfigUpdated(
        address treasury,
        address platform,
        uint256 creationFee
    );
    
    constructor(
        address _treasury,
        address _platform,
        uint256 _creationFee
    ) Ownable(msg.sender) {  // Fixed: Pass initial owner to Ownable
        treasury = _treasury;
        platform = _platform;
        creationFee = _creationFee;
    }
    
    /**
     * @dev Create a new influencer token
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _influencerName Display name of the influencer
     * @param _influencerWallet Wallet address of the influencer
     * @param _totalSupply Total supply of tokens (will be distributed according to allocation)
     */
    function createCoin(
        string memory _name,
        string memory _symbol,
        string memory _influencerName,
        address _influencerWallet,
        uint256 _totalSupply
    ) external payable nonReentrant returns (address) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(_influencerWallet != address(0), "Invalid influencer wallet");
        require(_totalSupply > 0, "Total supply must be greater than 0");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_symbol).length > 0, "Symbol cannot be empty");
        require(bytes(_influencerName).length > 0, "Influencer name cannot be empty");
        
        // Deploy new token contract
        InfluencerToken newToken = new InfluencerToken(
            _name,
            _symbol,
            _influencerName,
            _influencerWallet,
            treasury,
            platform,
            _totalSupply
        );
        
        address tokenAddress = address(newToken);
        
        // Store token information
        allTokens.push(tokenAddress);
        tokenCreator[tokenAddress] = msg.sender;
        
        // Send creation fee to treasury
        if (msg.value > 0) {
            payable(treasury).transfer(msg.value);
        }
        
        emit TokenCreated(
            tokenAddress,
            _name,
            _symbol,
            _influencerName,
            _influencerWallet,
            _totalSupply,
            msg.sender
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Get all created token addresses
     */
    function getAllCoins() external view returns (address[] memory) {
        return allTokens;
    }
    
    /**
     * @dev Get factory configuration info
     */
    function getFactoryInfo() external view returns (
        address _treasury,
        address _platform,
        uint256 _creationFee,
        uint256 _totalTokens
    ) {
        return (treasury, platform, creationFee, allTokens.length);
    }
    
    /**
     * @dev Get detailed information about multiple tokens
     * @param _tokens Array of token addresses to query
     */
    function getTokensInfo(address[] memory _tokens) external view returns (
        string[] memory names,
        string[] memory symbols,
        string[] memory influencerNames,
        address[] memory influencerWallets,
        uint256[] memory totalSupplies,
        uint256[] memory launchTimes
    ) {
        uint256 length = _tokens.length;
        names = new string[](length);
        symbols = new string[](length);
        influencerNames = new string[](length);
        influencerWallets = new address[](length);
        totalSupplies = new uint256[](length);
        launchTimes = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            InfluencerToken token = InfluencerToken(_tokens[i]);
            names[i] = token.name();
            symbols[i] = token.symbol();
            influencerNames[i] = token.influencerName();
            influencerWallets[i] = token.influencerWallet();
            totalSupplies[i] = token.totalSupply();
            launchTimes[i] = token.launchTime();
        }
    }
    
    /**
     * @dev Update factory configuration (only owner)
     */
    function updateFactoryConfig(
        address _treasury,
        address _platform,
        uint256 _creationFee
    ) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        require(_platform != address(0), "Invalid platform address");
        
        treasury = _treasury;
        platform = _platform;
        creationFee = _creationFee;
        
        emit FactoryConfigUpdated(_treasury, _platform, _creationFee);
    }
    
    /**
     * @dev Emergency withdraw function (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Get the number of tokens created
     */
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @dev Get token address by index
     */
    function getTokenByIndex(uint256 _index) external view returns (address) {
        require(_index < allTokens.length, "Index out of bounds");
        return allTokens[_index];
    }
    
    /**
     * @dev Check if an address is a token created by this factory
     */
    function isFactoryToken(address _token) external view returns (bool) {
        for (uint256 i = 0; i < allTokens.length; i++) {
            if (allTokens[i] == _token) {
                return true;
            }
        }
        return false;
    }
}