// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityLocker is Ownable, ReentrancyGuard {
    struct LockInfo {
        address token;
        address owner;
        uint256 amount;
        uint256 unlockTime;
        bool withdrawn;
    }
    
    mapping(uint256 => LockInfo) public locks;
    mapping(address => uint256[]) public userLocks;
    uint256 public lockCounter;
    
    event TokensLocked(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        uint256 unlockTime
    );
    
    event TokensWithdrawn(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount
    );
    
    constructor() Ownable(msg.sender) {}
    
    function lockTokens(
        address token,
        uint256 amount,
        uint256 lockDuration
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Amount must be greater than 0");
        require(lockDuration > 0, "Lock duration must be greater than 0");
        
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        uint256 lockId = lockCounter++;
        uint256 unlockTime = block.timestamp + lockDuration;
        
        locks[lockId] = LockInfo({
            token: token,
            owner: msg.sender,
            amount: amount,
            unlockTime: unlockTime,
            withdrawn: false
        });
        
        userLocks[msg.sender].push(lockId);
        
        emit TokensLocked(lockId, token, msg.sender, amount, unlockTime);
        
        return lockId;
    }
    
    function withdrawTokens(uint256 lockId) external nonReentrant {
        LockInfo storage lockInfo = locks[lockId];
        
        require(lockInfo.owner == msg.sender, "Not the owner");
        require(!lockInfo.withdrawn, "Already withdrawn");
        require(block.timestamp >= lockInfo.unlockTime, "Tokens still locked");
        
        lockInfo.withdrawn = true;
        IERC20(lockInfo.token).transfer(msg.sender, lockInfo.amount);
        
        emit TokensWithdrawn(lockId, lockInfo.token, msg.sender, lockInfo.amount);
    }
    
    function getLockInfo(uint256 lockId) external view returns (LockInfo memory) {
        return locks[lockId];
    }
    
    function getUserLocks(address user) external view returns (uint256[] memory) {
        return userLocks[user];
    }
    
    function getTimeUntilUnlock(uint256 lockId) external view returns (uint256) {
        LockInfo memory lockInfo = locks[lockId];
        if (block.timestamp >= lockInfo.unlockTime) {
            return 0;
        }
        return lockInfo.unlockTime - block.timestamp;
    }
}
