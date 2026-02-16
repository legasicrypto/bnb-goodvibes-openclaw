// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LegasiCore} from "./LegasiCore.sol";
import {ReputationRegistry} from "./ReputationRegistry.sol";

contract LegasiLending {
    struct CollateralDeposit {
        address token;
        uint256 amount;
    }

    struct BorrowedAmount {
        address token;
        uint256 amount;
    }

    struct Position {
        address owner;
        CollateralDeposit[] collaterals;
        BorrowedAmount[] borrows;
        uint256 lastUpdate;
    }

    struct AgentConfig {
        uint256 dailyBorrowLimitUsd6;
        uint256 dailyBorrowedUsd6;
        uint256 periodStart;
        bool autoRepayEnabled;
        bool x402Enabled;
    }

    LegasiCore public core;
    ReputationRegistry public reputation;

    mapping(address => Position) public positions;
    mapping(address => AgentConfig) public agentConfigs;

    event PositionCreated(address indexed owner);
    event Deposited(address indexed owner, address token, uint256 amount);
    event Borrowed(address indexed owner, address token, uint256 amount);
    event Repaid(address indexed owner, address token, uint256 amount);

    constructor(address _core, address _reputation) {
        core = LegasiCore(_core);
        reputation = ReputationRegistry(_reputation);
    }

    function initializePosition() external {
        Position storage p = positions[msg.sender];
        require(p.owner == address(0), "exists");
        p.owner = msg.sender;
        p.lastUpdate = block.timestamp;
        emit PositionCreated(msg.sender);
    }

    function configureAgent(uint256 dailyLimitUsd6, bool autoRepay, bool x402) external {
        AgentConfig storage cfg = agentConfigs[msg.sender];
        cfg.dailyBorrowLimitUsd6 = dailyLimitUsd6;
        cfg.autoRepayEnabled = autoRepay;
        cfg.x402Enabled = x402;
        cfg.periodStart = block.timestamp;
        cfg.dailyBorrowedUsd6 = 0;
    }

    function deposit(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        positions[msg.sender].collaterals.push(CollateralDeposit(token, amount));
        emit Deposited(msg.sender, token, amount);
    }

    function borrow(address token, uint256 amount) external {
        // naive: no LTV checks (demo only)
        positions[msg.sender].borrows.push(BorrowedAmount(token, amount));
        IERC20(token).transfer(msg.sender, amount);
        emit Borrowed(msg.sender, token, amount);
    }

    function repay(address token, uint256 amount, uint256 amountUsd6) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Reduce borrowed amount
        Position storage p = positions[msg.sender];
        uint256 remaining = amount;
        for (uint256 i = 0; i < p.borrows.length && remaining > 0; i++) {
            if (p.borrows[i].token != token) continue;
            uint256 bal = p.borrows[i].amount;
            if (bal == 0) continue;
            if (bal > remaining) {
                p.borrows[i].amount = bal - remaining;
                remaining = 0;
            } else {
                remaining -= bal;
                p.borrows[i].amount = 0;
            }
        }
        
        reputation.updateOnRepay(msg.sender, amountUsd6);
        emit Repaid(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external {
        require(amount > 0, "amount");
        Position storage p = positions[msg.sender];
        uint256 remaining = amount;
        for (uint256 i = 0; i < p.collaterals.length && remaining > 0; i++) {
            if (p.collaterals[i].token != token) continue;
            uint256 bal = p.collaterals[i].amount;
            if (bal == 0) continue;
            if (bal > remaining) {
                p.collaterals[i].amount = bal - remaining;
                remaining = 0;
            } else {
                remaining -= bal;
                p.collaterals[i].amount = 0;
            }
        }
        require(remaining == 0, "insufficient");
        IERC20(token).transfer(msg.sender, amount);
    }

    function getPosition(address owner) external view returns (Position memory) {
        return positions[owner];
    }

    function getCollaterals(address owner) external view returns (CollateralDeposit[] memory) {
        return positions[owner].collaterals;
    }

    function getBorrows(address owner) external view returns (BorrowedAmount[] memory) {
        return positions[owner].borrows;
    }

    function totalCollateralOf(address owner, address token) external view returns (uint256) {
        Position storage p = positions[owner];
        uint256 total;
        for (uint256 i = 0; i < p.collaterals.length; i++) {
            if (p.collaterals[i].token == token) total += p.collaterals[i].amount;
        }
        return total;
    }

    function totalBorrowOf(address owner, address token) external view returns (uint256) {
        Position storage p = positions[owner];
        uint256 total;
        for (uint256 i = 0; i < p.borrows.length; i++) {
            if (p.borrows[i].token == token) total += p.borrows[i].amount;
        }
        return total;
    }
}
