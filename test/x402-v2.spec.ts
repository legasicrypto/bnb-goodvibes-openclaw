import { expect } from "chai";
import { ethers } from "hardhat";

describe("x402 v2 (X402USDCReceipt)", () => {
  it("should transfer mUSDC and record receipt bound to resource", async () => {
    const [payer, recipient] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const usdc = await Mock.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();

    const X402V2 = await ethers.getContractFactory("X402USDCReceipt");
    const x402 = await X402V2.deploy();
    await x402.waitForDeployment();

    // mint + approve
    await (await usdc.mint(payer.address, 200_000000n)).wait();
    await (await usdc.connect(payer).approve(await x402.getAddress(), 150_000000n)).wait();

    const paymentId = ethers.keccak256(ethers.toUtf8Bytes("payment-1"));
    const resourceHash = ethers.keccak256(ethers.toUtf8Bytes("/api/premium/compute"));
    const amount = 100_000000n;

    await expect(
      x402.connect(payer).pay(paymentId, resourceHash, recipient.address, await usdc.getAddress(), amount, 0)
    )
      .to.emit(x402, "X402Paid")
      .withArgs(paymentId, resourceHash, payer.address, recipient.address, await usdc.getAddress(), amount, 0);

    const receipt = await x402.receipts(paymentId);
    expect(receipt.payer).to.eq(payer.address);
    expect(receipt.recipient).to.eq(recipient.address);
    expect(receipt.token).to.eq(await usdc.getAddress());
    expect(receipt.amount).to.eq(amount);

    // balances
    expect(await usdc.balanceOf(recipient.address)).to.eq(amount);

    // replay should fail
    await expect(
      x402.connect(payer).pay(paymentId, resourceHash, recipient.address, await usdc.getAddress(), amount, 0)
    ).to.be.revertedWithCustomError(x402, "AlreadyPaid");
  });
});
