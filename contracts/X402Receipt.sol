// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract X402Receipt {
    struct Receipt {
        bytes32 paymentId;
        address payer;
        address recipient;
        uint256 amount;
        uint256 paidAt;
    }

    mapping(bytes32 => Receipt) public receipts;

    event X402Paid(bytes32 paymentId, address payer, address recipient, uint256 amount);

    function record(bytes32 paymentId, address payer, address recipient, uint256 amount) external {
        receipts[paymentId] = Receipt(paymentId, payer, recipient, amount, block.timestamp);
        emit X402Paid(paymentId, payer, recipient, amount);
    }
}
