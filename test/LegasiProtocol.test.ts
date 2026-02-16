import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Legasi Protocol", function () {
  async function deployFixture() {
    const [owner, user, cranker] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const weth = await MockERC20.deploy("WETH", "WETH", 6);

    // Deploy core
    const Core = await ethers.getContractFactory("LegasiCore");
    const core = await Core.deploy(owner.address);

    // Register collateral
    await core.registerCollateral(
      await weth.getAddress(),
      7500, // 75% LTV
      8000, // 80% liquidation threshold
      500,  // 5% bonus
      6     // decimals
    );

    // Register borrowable
    await core.registerBorrowable(
      await usdc.getAddress(),
      500, // 5% APY
      6    // decimals
    );

    // Set prices
    await core.updatePrice(await weth.getAddress(), 2600_000000); // $2,600
    await core.updatePrice(await usdc.getAddress(), 1_000000);    // $1

    // Deploy reputation
    const Reputation = await ethers.getContractFactory("ReputationRegistry");
    const reputation = await Reputation.deploy();

    // Deploy lending
    const Lending = await ethers.getContractFactory("LegasiLending");
    const lending = await Lending.deploy(
      await core.getAddress(),
      await reputation.getAddress()
    );

    // Deploy LP
    const LP = await ethers.getContractFactory("LegasiLP");
    const lp = await LP.deploy(
      await usdc.getAddress(),
      "Legasi LP",
      "lLP"
    );

    // Deploy Flash
    const Flash = await ethers.getContractFactory("LegasiFlash");
    const flash = await Flash.deploy(owner.address);

    // Deploy GAD
    const GAD = await ethers.getContractFactory("LegasiGAD");
    const gad = await GAD.deploy(
      await core.getAddress(),
      await reputation.getAddress(),
      await lending.getAddress(),
      owner.address
    );

    // Mint tokens to user
    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await weth.mint(user.address, ethers.parseUnits("10", 6));

    // Seed lending pool
    await usdc.mint(await lending.getAddress(), ethers.parseUnits("1000000", 6));

    // Seed flash pool
    await usdc.mint(owner.address, ethers.parseUnits("100000", 6));
    await usdc.approve(await flash.getAddress(), ethers.parseUnits("100000", 6));
    await flash.deposit(await usdc.getAddress(), ethers.parseUnits("100000", 6));

    return { owner, user, cranker, usdc, weth, core, reputation, lending, lp, flash, gad };
  }

  describe("Core", function () {
    it("should register collateral", async function () {
      const { core, weth } = await loadFixture(deployFixture);
      const config = await core.collateralConfigs(await weth.getAddress());
      expect(config.isActive).to.be.true;
      expect(config.maxLtvBps).to.equal(7500);
    });

    it("should update prices", async function () {
      const { core, weth } = await loadFixture(deployFixture);
      const price = await core.priceFeeds(await weth.getAddress());
      expect(price.priceUsd6).to.equal(2600_000000);
    });
  });

  describe("Lending", function () {
    it("should deposit collateral", async function () {
      const { user, weth, lending } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1", 6);
      
      await weth.connect(user).approve(await lending.getAddress(), amount);
      await lending.connect(user).deposit(await weth.getAddress(), amount);
      
      const collateral = await lending.totalCollateralOf(user.address, await weth.getAddress());
      expect(collateral).to.equal(amount);
    });

    it("should borrow USDC", async function () {
      const { user, usdc, weth, lending } = await loadFixture(deployFixture);
      
      // Deposit 1 WETH (~$2,600 value)
      const depositAmount = ethers.parseUnits("1", 6);
      await weth.connect(user).approve(await lending.getAddress(), depositAmount);
      await lending.connect(user).deposit(await weth.getAddress(), depositAmount);
      
      // Borrow 500 USDC
      const borrowAmount = ethers.parseUnits("500", 6);
      await lending.connect(user).borrow(await usdc.getAddress(), borrowAmount);
      
      const borrowed = await lending.totalBorrowOf(user.address, await usdc.getAddress());
      expect(borrowed).to.equal(borrowAmount);
    });

    it("should repay and reduce debt", async function () {
      const { user, usdc, weth, lending } = await loadFixture(deployFixture);
      
      // Setup: deposit and borrow
      const depositAmount = ethers.parseUnits("1", 6);
      await weth.connect(user).approve(await lending.getAddress(), depositAmount);
      await lending.connect(user).deposit(await weth.getAddress(), depositAmount);
      
      const borrowAmount = ethers.parseUnits("500", 6);
      await lending.connect(user).borrow(await usdc.getAddress(), borrowAmount);
      
      // Repay half
      const repayAmount = ethers.parseUnits("250", 6);
      await usdc.connect(user).approve(await lending.getAddress(), repayAmount);
      await lending.connect(user).repay(await usdc.getAddress(), repayAmount, repayAmount);
      
      const remaining = await lending.totalBorrowOf(user.address, await usdc.getAddress());
      expect(remaining).to.equal(borrowAmount - repayAmount);
    });

    it("should withdraw collateral", async function () {
      const { user, weth, lending } = await loadFixture(deployFixture);
      
      const amount = ethers.parseUnits("1", 6);
      await weth.connect(user).approve(await lending.getAddress(), amount);
      await lending.connect(user).deposit(await weth.getAddress(), amount);
      
      // Withdraw
      await lending.connect(user).withdraw(await weth.getAddress(), amount);
      
      const collateral = await lending.totalCollateralOf(user.address, await weth.getAddress());
      expect(collateral).to.equal(0);
    });
  });

  describe("LP Vault", function () {
    it("should deposit and receive shares", async function () {
      const { user, usdc, lp } = await loadFixture(deployFixture);
      
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user).approve(await lp.getAddress(), amount);
      await lp.connect(user).deposit(amount);
      
      const lpToken = await ethers.getContractAt("LpToken", await lp.lpToken());
      const shares = await lpToken.balanceOf(user.address);
      expect(shares).to.equal(amount); // 1:1 on first deposit
    });

    it("should withdraw with shares", async function () {
      const { user, usdc, lp } = await loadFixture(deployFixture);
      
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(user).approve(await lp.getAddress(), amount);
      await lp.connect(user).deposit(amount);
      
      const lpToken = await ethers.getContractAt("LpToken", await lp.lpToken());
      const shares = await lpToken.balanceOf(user.address);
      
      await lp.connect(user).withdraw(shares);
      
      const finalShares = await lpToken.balanceOf(user.address);
      expect(finalShares).to.equal(0);
    });
  });

  describe("Flash Loans", function () {
    it("should have liquidity", async function () {
      const { usdc, flash } = await loadFixture(deployFixture);
      const liquidity = await flash.getAvailableLiquidity(await usdc.getAddress());
      expect(liquidity).to.equal(ethers.parseUnits("100000", 6));
    });

    it("should calculate correct fee", async function () {
      const { flash } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("10000", 6);
      const fee = await flash.calculateFee(amount);
      // 0.09% fee
      expect(fee).to.equal(ethers.parseUnits("9", 6));
    });
  });

  describe("Reputation", function () {
    it("should update score on repay", async function () {
      const { user, reputation } = await loadFixture(deployFixture);
      
      await reputation.updateOnRepay(user.address, 1000_000000);
      
      const rep = await reputation.getReputation(user.address);
      expect(rep.successfulRepayments).to.equal(1);
      expect(rep.totalRepaidUsd6).to.equal(1000_000000);
    });

    it("should penalize on GAD event", async function () {
      const { user, reputation } = await loadFixture(deployFixture);
      
      // First build some reputation
      await reputation.updateOnRepay(user.address, 5000_000000);
      const repBefore = await reputation.getReputation(user.address);
      
      // GAD event
      await reputation.updateOnGad(user.address);
      const repAfter = await reputation.getReputation(user.address);
      
      expect(repAfter.gadEvents).to.equal(1);
      expect(repAfter.score).to.be.lt(repBefore.score);
    });
  });

  describe("GAD", function () {
    it("should configure GAD", async function () {
      const { user, gad } = await loadFixture(deployFixture);
      
      await gad.connect(user).configureGad(true, 7500);
      
      const config = await gad.gadConfigs(user.address);
      expect(config.enabled).to.be.true;
      expect(config.customThresholdBps).to.equal(7500);
    });

    it("should calculate correct GAD rate", async function () {
      const { gad } = await loadFixture(deployFixture);
      
      // 5% over (8000 vs 7500) = 500 bps excess
      // Rate = (500 * 500) / 100 = 2500, capped at 1000
      const rate1 = await gad.getGadRateBps(8000, 7500);
      expect(rate1).to.equal(1000); // Capped at max
      
      // 2% over (7700 vs 7500) = 200 bps excess
      // Rate = (200 * 200) / 100 = 400
      const rate2 = await gad.getGadRateBps(7700, 7500);
      expect(rate2).to.equal(400);
      
      // 1% over (7600 vs 7500) = 100 bps excess
      // Rate = (100 * 100) / 100 = 100
      const rate3 = await gad.getGadRateBps(7600, 7500);
      expect(rate3).to.equal(100);
    });
  });

  describe("Full Flow", function () {
    it("should complete deposit → borrow → repay → withdraw", async function () {
      const { user, usdc, weth, lending } = await loadFixture(deployFixture);
      
      // 1. Deposit 2 WETH
      const depositAmount = ethers.parseUnits("2", 6);
      await weth.connect(user).approve(await lending.getAddress(), depositAmount);
      await lending.connect(user).deposit(await weth.getAddress(), depositAmount);
      
      // 2. Borrow 1000 USDC
      const borrowAmount = ethers.parseUnits("1000", 6);
      await lending.connect(user).borrow(await usdc.getAddress(), borrowAmount);
      
      // 3. Repay all
      await usdc.connect(user).approve(await lending.getAddress(), borrowAmount);
      await lending.connect(user).repay(await usdc.getAddress(), borrowAmount, borrowAmount);
      
      // 4. Withdraw all
      await lending.connect(user).withdraw(await weth.getAddress(), depositAmount);
      
      // Verify final state
      const collateral = await lending.totalCollateralOf(user.address, await weth.getAddress());
      const debt = await lending.totalBorrowOf(user.address, await usdc.getAddress());
      
      expect(collateral).to.equal(0);
      expect(debt).to.equal(0);
    });
  });
});
