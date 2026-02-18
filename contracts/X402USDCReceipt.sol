// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title X402USDCReceipt
/// @notice Best-in-class x402 receipt contract for the hackathon demo.
/// - Payment is an actual ERC20 transfer (mUSDC) via transferFrom.
/// - Receipt binds the payment to a specific resource (resourceHash) and expiry.
/// - paymentId is unique; replay is prevented (cannot pay twice).
contract X402USDCReceipt {
    struct Receipt {
        bytes32 paymentId;
        bytes32 resourceHash;
        address payer;
        address recipient;
        address token;
        uint256 amount;
        uint256 paidAt;
        uint256 expiresAt;
    }

    mapping(bytes32 => Receipt) public receipts;

    event X402Paid(
        bytes32 indexed paymentId,
        bytes32 indexed resourceHash,
        address indexed payer,
        address recipient,
        address token,
        uint256 amount,
        uint256 expiresAt
    );

    error AlreadyPaid();
    error Expired();
    error InvalidRecipient();
    error InvalidToken();
    error AmountZero();

    function pay(
        bytes32 paymentId,
        bytes32 resourceHash,
        address recipient,
        address token,
        uint256 amount,
        uint256 expiresAt
    ) external {
        if (receipts[paymentId].paidAt != 0) revert AlreadyPaid();
        if (expiresAt != 0 && block.timestamp > expiresAt) revert Expired();
        if (recipient == address(0)) revert InvalidRecipient();
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert AmountZero();

        // pull funds from payer
        IERC20(token).transferFrom(msg.sender, recipient, amount);

        receipts[paymentId] = Receipt({
            paymentId: paymentId,
            resourceHash: resourceHash,
            payer: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            paidAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit X402Paid(paymentId, resourceHash, msg.sender, recipient, token, amount, expiresAt);
    }

    function isPaid(bytes32 paymentId) external view returns (bool) {
        return receipts[paymentId].paidAt != 0;
    }
}
