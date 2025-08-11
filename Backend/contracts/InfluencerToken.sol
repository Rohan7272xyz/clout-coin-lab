// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InfluencerToken is ERC20, Ownable {
    address public influencerWallet;
    uint256 public constant TOTAL_SUPPLY = 1_000_000 * 10**18; // 1M tokens
    uint256 public constant INFLUENCER_ALLOCATION = 300_000 * 10**18; // 30%
    uint256 public constant LIQUIDITY_ALLOCATION = 700_000 * 10**18; // 70%
    
    constructor(
        string memory name,
        string memory symbol,
        address _influencerWallet,
        address _liquidityWallet
    ) ERC20(name, symbol) Ownable(_liquidityWallet) {
        influencerWallet = _influencerWallet;
        
        // Mint 30% to influencer - FIXED: Added underscores
        _mint(_influencerWallet, INFLUENCER_ALLOCATION);
        
        // Mint 70% to liquidity wallet (deployer) - FIXED: Added underscores  
        _mint(_liquidityWallet, LIQUIDITY_ALLOCATION);
    }
    
    // Function to get allocation percentages
    function getAllocations() external pure returns (uint256 influencer, uint256 liquidity) {
        return (INFLUENCER_ALLOCATION, LIQUIDITY_ALLOCATION);
    }
    
    // Optional: Add burn function for deflationary mechanics
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}