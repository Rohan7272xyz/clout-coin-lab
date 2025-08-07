// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITokenFactory {
    function createCoin(
        string memory _name,
        string memory _symbol,
        string memory _influencerName,
        address _influencerWallet,
        uint256 _totalSupply
    ) external payable returns (address);
    
    function creationFee() external view returns (uint256);
}

contract PledgeManager is ReentrancyGuard, Ownable {
    ITokenFactory public immutable tokenFactory;
    IERC20 public immutable usdc; // USDC token contract
    
    // Pledge tracking structures
    struct InfluencerPledge {
        uint256 totalPledgedETH;
        uint256 totalPledgedUSDC;
        uint256 pledgeThresholdETH;
        uint256 pledgeThresholdUSDC;
        bool isApproved;
        bool isLaunched;
        address tokenAddress;
        string name;
        string symbol;
        string influencerName;
        uint256 createdAt;
        uint256 launchedAt;
    }
    
    struct UserPledge {
        uint256 ethAmount;
        uint256 usdcAmount;
        bool hasWithdrawn;
        uint256 pledgedAt;
    }
    
    // Storage
    mapping(address => InfluencerPledge) public influencerPledges;
    mapping(address => mapping(address => UserPledge)) public userPledges; // influencer => user => pledge
    mapping(address => address[]) public influencerPledgers; // Track all pledgers per influencer
    mapping(address => address[]) public userInfluencers; // Track all influencers user has pledged to
    
    address[] public allInfluencers;
    mapping(address => bool) public isInfluencerRegistered;
    
    // Events
    event PledgeMade(
        address indexed influencer,
        address indexed pledger,
        uint256 ethAmount,
        uint256 usdcAmount,
        uint256 totalETH,
        uint256 totalUSDC
    );
    
    event ThresholdReached(
        address indexed influencer,
        uint256 totalETH,
        uint256 totalUSDC,
        uint256 timestamp
    );
    
    event InfluencerApproved(
        address indexed influencer,
        uint256 timestamp
    );
    
    event TokenLaunched(
        address indexed influencer,
        address indexed tokenAddress,
        uint256 totalRaisedETH,
        uint256 totalRaisedUSDC,
        uint256 timestamp
    );
    
    event PledgeWithdrawn(
        address indexed influencer,
        address indexed pledger,
        uint256 ethAmount,
        uint256 usdcAmount
    );
    
    event ThresholdUpdated(
        address indexed influencer,
        uint256 newETHThreshold,
        uint256 newUSDCThreshold
    );
    
    constructor(address _tokenFactory, address _usdc) Ownable(msg.sender) {
        tokenFactory = ITokenFactory(_tokenFactory);
        usdc = IERC20(_usdc);
    }
    
    // Admin Functions
    function setInfluencerThreshold(
        address influencer,
        uint256 ethThreshold,
        uint256 usdcThreshold,
        string memory name,
        string memory symbol,
        string memory influencerName
    ) external onlyOwner {
        require(influencer != address(0), "Invalid influencer address");
        require(ethThreshold > 0 || usdcThreshold > 0, "At least one threshold must be > 0");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        
        if (!isInfluencerRegistered[influencer]) {
            allInfluencers.push(influencer);
            isInfluencerRegistered[influencer] = true;
            influencerPledges[influencer].createdAt = block.timestamp;
        }
        
        influencerPledges[influencer].pledgeThresholdETH = ethThreshold;
        influencerPledges[influencer].pledgeThresholdUSDC = usdcThreshold;
        influencerPledges[influencer].name = name;
        influencerPledges[influencer].symbol = symbol;
        influencerPledges[influencer].influencerName = influencerName;
        
        emit ThresholdUpdated(influencer, ethThreshold, usdcThreshold);
    }
    
    function approveInfluencer(address influencer) external onlyOwner {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        require(isThresholdMet(influencer), "Threshold not met");
        
        influencerPledges[influencer].isApproved = true;
        
        emit InfluencerApproved(influencer, block.timestamp);
    }
    
    // Public Functions
    function pledgeToInfluencer(address influencer) external payable nonReentrant {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        require(msg.value > 0, "Must send ETH to pledge");
        
        // Update user pledge
        UserPledge storage userPledge = userPledges[influencer][msg.sender];
        if (userPledge.ethAmount == 0 && userPledge.usdcAmount == 0) {
            // First time pledging to this influencer
            influencerPledgers[influencer].push(msg.sender);
            userInfluencers[msg.sender].push(influencer);
            userPledge.pledgedAt = block.timestamp;
        }
        
        userPledge.ethAmount += msg.value;
        
        // Update total pledge
        influencerPledges[influencer].totalPledgedETH += msg.value;
        
        emit PledgeMade(
            influencer,
            msg.sender,
            msg.value,
            0,
            influencerPledges[influencer].totalPledgedETH,
            influencerPledges[influencer].totalPledgedUSDC
        );
        
        // Check if threshold is reached
        if (isThresholdMet(influencer)) {
            emit ThresholdReached(
                influencer,
                influencerPledges[influencer].totalPledgedETH,
                influencerPledges[influencer].totalPledgedUSDC,
                block.timestamp
            );
        }
    }
    
    function pledgeUSDCToInfluencer(address influencer, uint256 amount) external nonReentrant {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        require(amount > 0, "Amount must be > 0");
        
        // Transfer USDC from user
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        // Update user pledge
        UserPledge storage userPledge = userPledges[influencer][msg.sender];
        if (userPledge.ethAmount == 0 && userPledge.usdcAmount == 0) {
            // First time pledging to this influencer
            influencerPledgers[influencer].push(msg.sender);
            userInfluencers[msg.sender].push(influencer);
            userPledge.pledgedAt = block.timestamp;
        }
        
        userPledge.usdcAmount += amount;
        
        // Update total pledge
        influencerPledges[influencer].totalPledgedUSDC += amount;
        
        emit PledgeMade(
            influencer,
            msg.sender,
            0,
            amount,
            influencerPledges[influencer].totalPledgedETH,
            influencerPledges[influencer].totalPledgedUSDC
        );
        
        // Check if threshold is reached
        if (isThresholdMet(influencer)) {
            emit ThresholdReached(
                influencer,
                influencerPledges[influencer].totalPledgedETH,
                influencerPledges[influencer].totalPledgedUSDC,
                block.timestamp
            );
        }
    }
    
    function withdrawPledge(address influencer) external nonReentrant {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(!influencerPledges[influencer].isLaunched, "Token already launched - cannot withdraw");
        
        UserPledge storage userPledge = userPledges[influencer][msg.sender];
        require(!userPledge.hasWithdrawn, "Already withdrawn");
        require(userPledge.ethAmount > 0 || userPledge.usdcAmount > 0, "No pledge found");
        
        uint256 ethAmount = userPledge.ethAmount;
        uint256 usdcAmount = userPledge.usdcAmount;
        
        // Mark as withdrawn
        userPledge.hasWithdrawn = true;
        
        // Update totals
        influencerPledges[influencer].totalPledgedETH -= ethAmount;
        influencerPledges[influencer].totalPledgedUSDC -= usdcAmount;
        
        // Refund ETH
        if (ethAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: ethAmount}("");
            require(success, "ETH refund failed");
        }
        
        // Refund USDC
        if (usdcAmount > 0) {
            require(usdc.transfer(msg.sender, usdcAmount), "USDC refund failed");
        }
        
        emit PledgeWithdrawn(influencer, msg.sender, ethAmount, usdcAmount);
    }
    
    function launchToken(address influencer) external onlyOwner nonReentrant {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(influencerPledges[influencer].isApproved, "Influencer not approved");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        require(isThresholdMet(influencer), "Threshold not met");
        
        InfluencerPledge storage pledge = influencerPledges[influencer];
        
        // Calculate creation fee
        uint256 creationFee = tokenFactory.creationFee();
        require(address(this).balance >= creationFee, "Insufficient ETH for creation fee");
        
        // Create the token
        address newToken = tokenFactory.createCoin{value: creationFee}(
            pledge.name,
            pledge.symbol,
            pledge.influencerName,
            influencer,
            1000000 * 10**18 // 1M tokens with 18 decimals
        );
        
        // Update state
        pledge.isLaunched = true;
        pledge.tokenAddress = newToken;
        pledge.launchedAt = block.timestamp;
        
        emit TokenLaunched(
            influencer,
            newToken,
            pledge.totalPledgedETH,
            pledge.totalPledgedUSDC,
            block.timestamp
        );
    }
    
    // View Functions
    function isThresholdMet(address influencer) public view returns (bool) {
        InfluencerPledge memory pledge = influencerPledges[influencer];
        return (pledge.totalPledgedETH >= pledge.pledgeThresholdETH && pledge.pledgeThresholdETH > 0) ||
               (pledge.totalPledgedUSDC >= pledge.pledgeThresholdUSDC && pledge.pledgeThresholdUSDC > 0);
    }
    
    function getInfluencerPledge(address influencer) external view returns (InfluencerPledge memory) {
        return influencerPledges[influencer];
    }
    
    function getUserPledge(address influencer, address user) external view returns (UserPledge memory) {
        return userPledges[influencer][user];
    }
    
    function getInfluencerPledgers(address influencer) external view returns (address[] memory) {
        return influencerPledgers[influencer];
    }
    
    function getUserInfluencers(address user) external view returns (address[] memory) {
        return userInfluencers[user];
    }
    
    function getAllInfluencers() external view returns (address[] memory) {
        return allInfluencers;
    }
    
    function getPledgeProgress(address influencer) external view returns (
        uint256 totalETH,
        uint256 totalUSDC,
        uint256 thresholdETH,
        uint256 thresholdUSDC,
        uint256 pledgerCount,
        bool thresholdMet,
        bool isApproved,
        bool isLaunched
    ) {
        InfluencerPledge memory pledge = influencerPledges[influencer];
        return (
            pledge.totalPledgedETH,
            pledge.totalPledgedUSDC,
            pledge.pledgeThresholdETH,
            pledge.pledgeThresholdUSDC,
            influencerPledgers[influencer].length,
            isThresholdMet(influencer),
            pledge.isApproved,
            pledge.isLaunched
        );
    }
    
    // Admin withdrawal functions
    function withdrawPlatformFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function withdrawUSDC() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        require(usdc.transfer(owner(), balance), "USDC withdrawal failed");
    }
    
    // Emergency functions
    function emergencyPause(address influencer) external onlyOwner {
        require(isInfluencerRegistered[influencer], "Influencer not registered");
        require(!influencerPledges[influencer].isLaunched, "Token already launched");
        
        // This effectively pauses pledging by setting thresholds to max
        influencerPledges[influencer].pledgeThresholdETH = type(uint256).max;
        influencerPledges[influencer].pledgeThresholdUSDC = type(uint256).max;
    }
}