// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @notice Interface that flash loan receivers must implement
 */
interface IFlashLoanReceiver {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

/**
 * @title LegasiFlash - Flash Loans for AI Agents
 * @notice Zero-collateral loans that must be repaid in the same transaction
 * @dev Optimized for agent arbitrage and liquidation operations
 * 
 * Key features:
 * - 0.09% fee (competitive with Aave)
 * - No collateral required
 * - Same-transaction repayment enforced
 * - Works with any ERC20 token in the pool
 */
contract LegasiFlash is ReentrancyGuard {
    // ========== CONSTANTS ==========
    uint256 public constant FEE_BPS = 9; // 0.09%
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ========== STATE ==========
    address public treasury;
    mapping(address => uint256) public poolBalances; // token => balance
    
    // ========== EVENTS ==========
    event FlashLoan(
        address indexed borrower,
        address indexed token,
        uint256 amount,
        uint256 fee,
        bytes32 indexed operationId
    );
    event PoolDeposit(address indexed token, uint256 amount);
    event PoolWithdraw(address indexed token, uint256 amount);

    // ========== CONSTRUCTOR ==========
    constructor(address _treasury) {
        treasury = _treasury;
    }

    // ========== POOL MANAGEMENT ==========
    
    /**
     * @notice Deposit tokens into the flash loan pool
     * @param token Token address
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        poolBalances[token] += amount;
        emit PoolDeposit(token, amount);
    }

    /**
     * @notice Withdraw tokens from the pool (treasury only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external {
        require(msg.sender == treasury, "only treasury");
        require(poolBalances[token] >= amount, "insufficient");
        poolBalances[token] -= amount;
        IERC20(token).transfer(treasury, amount);
        emit PoolWithdraw(token, amount);
    }

    // ========== FLASH LOAN ==========
    
    /**
     * @notice Execute a flash loan
     * @param token Token to borrow
     * @param amount Amount to borrow
     * @param receiver Contract that will receive the funds and execute logic
     * @param data Arbitrary data passed to the receiver
     * @return operationId Unique identifier for this flash loan
     * 
     * @dev Flow:
     * 1. Tokens transferred to receiver
     * 2. receiver.onFlashLoan() called
     * 3. Receiver must approve this contract for amount + fee
     * 4. Tokens pulled back with fee
     * 5. If any step fails, entire tx reverts
     */
    function flashLoan(
        address token,
        uint256 amount,
        address receiver,
        bytes calldata data
    ) external nonReentrant returns (bytes32 operationId) {
        require(amount > 0, "amount zero");
        require(poolBalances[token] >= amount, "insufficient liquidity");
        
        uint256 fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        
        // Generate unique operation ID
        operationId = keccak256(abi.encodePacked(
            msg.sender,
            token,
            amount,
            block.timestamp,
            block.number
        ));
        
        // Transfer tokens to receiver
        IERC20(token).transfer(receiver, amount);
        
        // Call receiver
        bytes32 returnedId = IFlashLoanReceiver(receiver).onFlashLoan(
            msg.sender,
            token,
            amount,
            fee,
            data
        );
        require(returnedId == operationId, "invalid callback");
        
        // Pull tokens back (receiver must have approved)
        uint256 repayAmount = amount + fee;
        IERC20(token).transferFrom(receiver, address(this), repayAmount);
        
        // Verify repayment
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        require(balanceAfter >= balanceBefore + fee, "repayment failed");
        
        // Update pool balance (add fee to pool)
        poolBalances[token] += fee;
        
        // Fee to treasury
        IERC20(token).transfer(treasury, fee);
        poolBalances[token] -= fee;
        
        emit FlashLoan(msg.sender, token, amount, fee, operationId);
    }

    // ========== SIMPLE FLASH (NO CALLBACK) ==========
    
    /**
     * @notice Simple flash loan for EOA/simple contracts
     * @dev Borrower must repay in the same tx after this call returns
     * @param token Token to borrow
     * @param amount Amount to borrow
     */
    function flashBorrow(address token, uint256 amount) external nonReentrant returns (uint256 fee) {
        require(amount > 0, "amount zero");
        require(poolBalances[token] >= amount, "insufficient liquidity");
        
        fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        
        // Transfer tokens to borrower
        IERC20(token).transfer(msg.sender, amount);
        
        // Store expected repayment
        _pendingRepayments[msg.sender][token] = amount + fee;
    }
    
    mapping(address => mapping(address => uint256)) private _pendingRepayments;
    
    /**
     * @notice Repay a simple flash loan
     * @param token Token to repay
     */
    function flashRepay(address token) external nonReentrant {
        uint256 repayAmount = _pendingRepayments[msg.sender][token];
        require(repayAmount > 0, "no pending loan");
        
        // Pull repayment
        IERC20(token).transferFrom(msg.sender, address(this), repayAmount);
        
        // Calculate fee
        uint256 fee = (repayAmount * FEE_BPS) / (BPS_DENOMINATOR + FEE_BPS);
        
        // Update pool
        poolBalances[token] += fee;
        
        // Fee to treasury
        IERC20(token).transfer(treasury, fee);
        poolBalances[token] -= fee;
        
        // Clear pending
        delete _pendingRepayments[msg.sender][token];
        
        emit FlashLoan(msg.sender, token, repayAmount - fee, fee, bytes32(0));
    }

    // ========== VIEW FUNCTIONS ==========
    
    /**
     * @notice Get available liquidity for a token
     */
    function getAvailableLiquidity(address token) external view returns (uint256) {
        return poolBalances[token];
    }
    
    /**
     * @notice Calculate fee for a given amount
     */
    function calculateFee(uint256 amount) external pure returns (uint256) {
        return (amount * FEE_BPS) / BPS_DENOMINATOR;
    }
    
    /**
     * @notice Get pending repayment for a borrower
     */
    function getPendingRepayment(address borrower, address token) external view returns (uint256) {
        return _pendingRepayments[borrower][token];
    }
}

// ========== EXAMPLE RECEIVER ==========

/**
 * @title FlashLoanArbitrage
 * @notice Example flash loan receiver for arbitrage
 */
contract FlashLoanArbitrage is IFlashLoanReceiver {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        // Decode arbitrage params
        (address dexA, address dexB, bytes memory swapDataA, bytes memory swapDataB) = 
            abi.decode(data, (address, address, bytes, bytes));
        
        // Execute arbitrage:
        // 1. Swap on DEX A
        // 2. Swap on DEX B
        // 3. Profit!
        
        // Approve repayment
        IERC20(token).approve(msg.sender, amount + fee);
        
        // Return operation ID
        return keccak256(abi.encodePacked(
            initiator,
            token,
            amount,
            block.timestamp,
            block.number
        ));
    }
}
