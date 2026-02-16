// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LegasiCore} from "./LegasiCore.sol";
import {ReputationRegistry} from "./ReputationRegistry.sol";

/**
 * @title LegasiGAD - Gradual Auto-Deleveraging
 * @notice Replaces sudden liquidations with gradual position unwinding
 * @dev Key innovation: quadratic rate curve protects users from MEV and sudden liquidations
 * 
 * How it works:
 * 1. When LTV exceeds maxLTV, position enters GAD zone
 * 2. GAD rate increases quadratically with LTV overshoot
 * 3. Anyone can "crank" to liquidate a small portion
 * 4. Cranker receives 0.5% reward for service
 * 5. Position gradually returns to healthy LTV
 */
contract LegasiGAD {
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant CRANKER_REWARD_BPS = 50; // 0.5%
    uint256 public constant MIN_CRANK_INTERVAL = 1 hours;
    uint256 public constant MAX_GAD_RATE_BPS = 1000; // 10% per day max
    uint256 public constant SECONDS_PER_DAY = 86400;

    struct GadConfig {
        bool enabled;
        uint16 customThresholdBps;
        uint256 lastCrank;
        uint256 totalLiquidatedUsd6;
        uint256 gadEvents;
    }

    struct Position {
        address collateralToken;
        uint256 collateralAmount;
        uint256 borrowAmount;
    }

    LegasiCore public core;
    ReputationRegistry public reputation;
    address public lendingContract;
    address public treasury;

    mapping(address => GadConfig) public gadConfigs;
    mapping(address => Position) public positions;

    event GadConfigured(address indexed user, bool enabled, uint16 thresholdBps);
    event GadExecuted(
        address indexed user,
        uint256 collateralLiquidated,
        uint256 debtReduced,
        uint256 ltvBeforeBps,
        uint256 ltvAfterBps,
        address indexed cranker,
        uint256 crankerReward
    );

    constructor(address _core, address _reputation, address _lending, address _treasury) {
        core = LegasiCore(_core);
        reputation = ReputationRegistry(_reputation);
        lendingContract = _lending;
        treasury = _treasury;
    }

    function configureGad(bool enabled, uint16 customThresholdBps) external {
        gadConfigs[msg.sender].enabled = enabled;
        gadConfigs[msg.sender].customThresholdBps = customThresholdBps;
        emit GadConfigured(msg.sender, enabled, customThresholdBps);
    }

    function syncPosition(
        address user,
        address collateralToken,
        uint256 collateralAmount,
        uint256 borrowAmount
    ) external {
        require(msg.sender == lendingContract, "only lending");
        positions[user] = Position(collateralToken, collateralAmount, borrowAmount);
    }

    /**
     * @notice Quadratic GAD rate: (excess/100)^2, capped at 10%/day
     */
    function getGadRateBps(uint256 currentLtvBps, uint256 maxLtvBps) public pure returns (uint256) {
        if (currentLtvBps <= maxLtvBps) return 0;
        uint256 excessBps = currentLtvBps - maxLtvBps;
        uint256 rate = (excessBps * excessBps) / 100;
        return rate > MAX_GAD_RATE_BPS ? MAX_GAD_RATE_BPS : rate;
    }

    /**
     * @notice Execute gradual deleveraging - anyone can call to earn reward
     */
    function crank(address user) external {
        GadConfig storage cfg = gadConfigs[user];
        Position storage pos = positions[user];
        
        require(cfg.enabled, "GAD disabled");
        require(pos.borrowAmount > 0, "No debt");
        require(block.timestamp >= cfg.lastCrank + MIN_CRANK_INTERVAL, "Too soon");
        
        // Get collateral price and decimals
        (uint256 price,) = core.priceFeeds(pos.collateralToken);
        require(price > 0, "No price");
        (,,,, uint8 decimals) = core.collateralConfigs(pos.collateralToken);
        
        // Calculate LTV
        uint256 collateralValue = (pos.collateralAmount * price) / (10 ** decimals);
        require(collateralValue > 0, "No collateral");
        uint256 currentLtv = (pos.borrowAmount * BPS_DENOMINATOR) / collateralValue;
        
        // Get threshold
        (, uint16 defaultMaxLtv,,,) = core.collateralConfigs(pos.collateralToken);
        uint256 maxLtv = cfg.customThresholdBps > 0 ? cfg.customThresholdBps : defaultMaxLtv;
        require(currentLtv > maxLtv, "LTV healthy");
        
        // Calculate liquidation
        uint256 gadRate = getGadRateBps(currentLtv, maxLtv);
        uint256 elapsed = block.timestamp - cfg.lastCrank;
        if (elapsed > SECONDS_PER_DAY) elapsed = SECONDS_PER_DAY;
        
        uint256 liquidateFraction = (gadRate * elapsed) / SECONDS_PER_DAY;
        uint256 collateralToLiquidate = (pos.collateralAmount * liquidateFraction) / BPS_DENOMINATOR;
        require(collateralToLiquidate > 0, "Amount too small");
        
        uint256 crankerReward = (collateralToLiquidate * CRANKER_REWARD_BPS) / BPS_DENOMINATOR;
        uint256 liquidatedValue = (collateralToLiquidate * price) / (10 ** decimals);
        uint256 debtReduction = liquidatedValue > pos.borrowAmount ? pos.borrowAmount : liquidatedValue;
        
        // Update state
        pos.collateralAmount -= (collateralToLiquidate + crankerReward);
        pos.borrowAmount -= debtReduction;
        cfg.lastCrank = block.timestamp;
        cfg.totalLiquidatedUsd6 += liquidatedValue;
        cfg.gadEvents += 1;
        
        // Update reputation
        reputation.updateOnGad(user);
        
        // Transfers
        IERC20(pos.collateralToken).transfer(treasury, collateralToLiquidate);
        IERC20(pos.collateralToken).transfer(msg.sender, crankerReward);
        
        // Calculate new LTV
        uint256 newCollateralValue = collateralValue - liquidatedValue;
        uint256 newLtv = newCollateralValue > 0 
            ? ((pos.borrowAmount + debtReduction - debtReduction) * BPS_DENOMINATOR) / newCollateralValue 
            : 0;
        
        emit GadExecuted(user, collateralToLiquidate, debtReduction, currentLtv, newLtv, msg.sender, crankerReward);
    }

    function canCrank(address user) external view returns (bool, string memory) {
        GadConfig storage cfg = gadConfigs[user];
        Position storage pos = positions[user];
        
        if (!cfg.enabled) return (false, "GAD disabled");
        if (pos.borrowAmount == 0) return (false, "No debt");
        if (block.timestamp < cfg.lastCrank + MIN_CRANK_INTERVAL) return (false, "Cooldown");
        
        (uint256 price,) = core.priceFeeds(pos.collateralToken);
        if (price == 0) return (false, "No price");
        
        (,,,, uint8 decimals) = core.collateralConfigs(pos.collateralToken);
        uint256 collateralValue = (pos.collateralAmount * price) / (10 ** decimals);
        if (collateralValue == 0) return (false, "No collateral");
        
        uint256 currentLtv = (pos.borrowAmount * BPS_DENOMINATOR) / collateralValue;
        (, uint16 defaultMaxLtv,,,) = core.collateralConfigs(pos.collateralToken);
        uint256 maxLtv = cfg.customThresholdBps > 0 ? cfg.customThresholdBps : defaultMaxLtv;
        
        if (currentLtv <= maxLtv) return (false, "LTV healthy");
        return (true, "Ready");
    }
    
    function getGadStats(address user) external view returns (
        bool enabled,
        uint256 totalLiquidatedUsd6,
        uint256 gadEvents,
        uint256 lastCrank
    ) {
        GadConfig storage cfg = gadConfigs[user];
        return (cfg.enabled, cfg.totalLiquidatedUsd6, cfg.gadEvents, cfg.lastCrank);
    }
}
