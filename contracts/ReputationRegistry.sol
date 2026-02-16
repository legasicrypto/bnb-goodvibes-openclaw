// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Minimal ERC-8004-style registry for agent reputation
contract ReputationRegistry {
    struct Reputation {
        uint256 score;
        uint256 successfulRepayments;
        uint256 totalRepaidUsd6;
        uint256 gadEvents;
        uint256 lastUpdate;
    }

    mapping(address => Reputation) public reputations;

    event ReputationUpdated(address indexed agent, uint256 score, uint256 totalRepaidUsd6, uint256 gadEvents);

    function updateOnRepay(address agent, uint256 repaidUsd6) external {
        Reputation storage r = reputations[agent];
        r.successfulRepayments += 1;
        r.totalRepaidUsd6 += repaidUsd6;
        r.lastUpdate = block.timestamp;
        r.score = _calcScore(r.successfulRepayments, r.gadEvents, r.lastUpdate);
        emit ReputationUpdated(agent, r.score, r.totalRepaidUsd6, r.gadEvents);
    }

    function updateOnGad(address agent) external {
        Reputation storage r = reputations[agent];
        r.gadEvents += 1;
        r.lastUpdate = block.timestamp;
        r.score = _calcScore(r.successfulRepayments, r.gadEvents, r.lastUpdate);
        emit ReputationUpdated(agent, r.score, r.totalRepaidUsd6, r.gadEvents);
    }

    function getReputation(address agent) external view returns (Reputation memory) {
        return reputations[agent];
    }

    function _calcScore(uint256 repayments, uint256 gadEvents, uint256 lastUpdate) internal view returns (uint256) {
        uint256 base = repayments * 50; // cap omitted for simplicity
        uint256 ageBonus = (block.timestamp - lastUpdate) / 30 days * 10; // coarse
        uint256 score = base + ageBonus;
        if (gadEvents > 0) {
            uint256 penalty = gadEvents * 100;
            if (score > penalty) score -= penalty; else score = 0;
        }
        return score;
    }
}
