// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LegasiCore is Ownable {
    struct Protocol {
        address treasury;
        bool paused;
    }

    struct CollateralConfig {
        bool isActive;
        uint16 maxLtvBps; // e.g. 7500 = 75%
        uint16 liquidationThresholdBps;
        uint16 liquidationBonusBps;
        uint8 decimals;
    }

    struct BorrowableConfig {
        bool isActive;
        uint16 interestRateBps; // simple fixed rate for demo
        uint8 decimals;
    }

    struct PriceFeed {
        uint256 priceUsd6; // price in 6 decimals
        uint256 lastUpdate;
    }

    Protocol public protocol;

    mapping(address => CollateralConfig) public collateralConfigs; // token => config
    mapping(address => BorrowableConfig) public borrowableConfigs; // token => config
    mapping(address => PriceFeed) public priceFeeds; // token => price

    event ProtocolInitialized(address admin, address treasury);
    event CollateralRegistered(address token, uint16 maxLtvBps);
    event BorrowableRegistered(address token, uint16 rateBps);
    event PriceUpdated(address token, uint256 priceUsd6, uint256 timestamp);
    event Paused(bool paused);

    constructor(address _treasury) Ownable(msg.sender) {
        protocol.treasury = _treasury;
        protocol.paused = false;
        emit ProtocolInitialized(msg.sender, _treasury);
    }

    function setPaused(bool _paused) external onlyOwner {
        protocol.paused = _paused;
        emit Paused(_paused);
    }

    function registerCollateral(
        address token,
        uint16 maxLtvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationBonusBps,
        uint8 decimals
    ) external onlyOwner {
        collateralConfigs[token] = CollateralConfig({
            isActive: true,
            maxLtvBps: maxLtvBps,
            liquidationThresholdBps: liquidationThresholdBps,
            liquidationBonusBps: liquidationBonusBps,
            decimals: decimals
        });
        emit CollateralRegistered(token, maxLtvBps);
    }

    function registerBorrowable(
        address token,
        uint16 interestRateBps,
        uint8 decimals
    ) external onlyOwner {
        borrowableConfigs[token] = BorrowableConfig({
            isActive: true,
            interestRateBps: interestRateBps,
            decimals: decimals
        });
        emit BorrowableRegistered(token, interestRateBps);
    }

    function updatePrice(address token, uint256 priceUsd6) external onlyOwner {
        priceFeeds[token] = PriceFeed({priceUsd6: priceUsd6, lastUpdate: block.timestamp});
        emit PriceUpdated(token, priceUsd6, block.timestamp);
    }
}
