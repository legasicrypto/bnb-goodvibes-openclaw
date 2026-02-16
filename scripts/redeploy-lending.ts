import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Existing addresses
  const core = "0x84d9D82d528D0E1c8c9d149577cE22be7526ca91";
  const reputation = "0xABad189F8127D24EcB98d6583e51Cc458c996Bf3";
  const usdc = "0x8692A9d69113E1454C09c631AdE12949E5c11306";

  // Deploy new Lending
  const Lending = await ethers.getContractFactory("LegasiLending");
  const lending = await Lending.deploy(core, reputation);
  await lending.waitForDeployment();
  const lendingAddr = await lending.getAddress();
  console.log("NEW Lending:", lendingAddr);

  // Seed pool with 1M USDC
  const usdcContract = await ethers.getContractAt("MockERC20", usdc);
  const tx = await usdcContract.mint(lendingAddr, BigInt(1000000 * 1e6));
  await tx.wait();
  console.log("Pool seeded with 1M USDC");
  
  console.log("\n=== UPDATE evmContracts.ts ===");
  console.log(`lending: "${lendingAddr}",`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
