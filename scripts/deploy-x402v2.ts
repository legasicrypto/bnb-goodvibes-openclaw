import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const X402V2 = await ethers.getContractFactory("X402USDCReceipt");
  const x402v2 = await X402V2.deploy();
  await x402v2.waitForDeployment();

  console.log("X402USDCReceipt (v2):", await x402v2.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
