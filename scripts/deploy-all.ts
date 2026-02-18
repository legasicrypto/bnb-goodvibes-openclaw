import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Mock = await ethers.getContractFactory("MockERC20");

  const mockUSDC = await Mock.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  const usdc = await mockUSDC.getAddress();
  console.log("Mock USDC:", usdc);

  const mockWBTC = await Mock.deploy("Mock WBTC", "mWBTC", 8);
  await mockWBTC.waitForDeployment();
  const wbtc = await mockWBTC.getAddress();
  console.log("Mock WBTC:", wbtc);

  const mockWETH = await Mock.deploy("Mock WETH", "mWETH", 6);
  await mockWETH.waitForDeployment();
  const weth = await mockWETH.getAddress();
  console.log("Mock WETH:", weth);

  const Core = await ethers.getContractFactory("LegasiCore");
  const core = await Core.deploy(deployer.address);
  await core.waitForDeployment();
  console.log("Core:", await core.getAddress());

  const Rep = await ethers.getContractFactory("ReputationRegistry");
  const rep = await Rep.deploy();
  await rep.waitForDeployment();
  console.log("ReputationRegistry:", await rep.getAddress());

  const Lending = await ethers.getContractFactory("LegasiLending");
  const lending = await Lending.deploy(await core.getAddress(), await rep.getAddress());
  await lending.waitForDeployment();
  console.log("Lending:", await lending.getAddress());

  const LP = await ethers.getContractFactory("LegasiLP");
  const lp = await LP.deploy(usdc, "bUSDC", "bUSDC");
  await lp.waitForDeployment();
  console.log("LP:", await lp.getAddress());

  const GAD = await ethers.getContractFactory("LegasiGAD");
  const gad = await GAD.deploy(
    await core.getAddress(),
    await rep.getAddress(),
    await lending.getAddress(),
    deployer.address
  );
  await gad.waitForDeployment();
  console.log("GAD:", await gad.getAddress());

  const Flash = await ethers.getContractFactory("LegasiFlash");
  const flash = await Flash.deploy(deployer.address);
  await flash.waitForDeployment();
  console.log("Flash:", await flash.getAddress());

  // x402 receipts (V1 kept for compatibility, V2 is best-in-class and used by the app)
  const X402 = await ethers.getContractFactory("X402Receipt");
  const x402 = await X402.deploy();
  await x402.waitForDeployment();
  console.log("X402Receipt (v1):", await x402.getAddress());

  const X402V2 = await ethers.getContractFactory("X402USDCReceipt");
  const x402v2 = await X402V2.deploy();
  await x402v2.waitForDeployment();
  console.log("X402USDCReceipt (v2):", await x402v2.getAddress());

  // register collateral + borrowable
  await (await core.registerCollateral(weth, 7500, 8000, 500, 6)).wait(); // WETH
  await (await core.registerCollateral(wbtc, 7000, 7500, 500, 8)).wait(); // WBTC
  await (await core.registerBorrowable(usdc, 900, 6)).wait(); // USDC (9% borrow)

  // seed prices (USD6)
  await (await core.updatePrice(weth, 2600_000000)).wait();
  await (await core.updatePrice(wbtc, 45000_000000)).wait();
  await (await core.updatePrice(usdc, 1_000000)).wait();

  // seed lending with USDC liquidity for demo borrows
  await (await mockUSDC.mint(await lending.getAddress(), 1_000_000_000_000n)).wait(); // 1,000,000 USDC (6d)

  console.log("Initialized collateral + borrowable + prices + seeded lending");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
