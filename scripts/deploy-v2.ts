import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Existing contracts
  const core = "0x84d9D82d528D0E1c8c9d149577cE22be7526ca91";
  const reputation = "0xABad189F8127D24EcB98d6583e51Cc458c996Bf3";
  const lending = "0xB966e02Ca94bD54F6a3aB64eD05045616a712618";
  const usdc = "0x8692A9d69113E1454C09c631AdE12949E5c11306";
  
  // Deploy new GAD
  console.log("\n--- Deploying LegasiGAD ---");
  const GAD = await ethers.getContractFactory("LegasiGAD");
  const gad = await GAD.deploy(core, reputation, lending, deployer.address);
  await gad.waitForDeployment();
  const gadAddr = await gad.getAddress();
  console.log("GAD:", gadAddr);

  // Deploy Flash
  console.log("\n--- Deploying LegasiFlash ---");
  const Flash = await ethers.getContractFactory("LegasiFlash");
  const flash = await Flash.deploy(deployer.address);
  await flash.waitForDeployment();
  const flashAddr = await flash.getAddress();
  console.log("Flash:", flashAddr);

  // Seed flash pool with 100k USDC
  console.log("\n--- Seeding Flash Pool ---");
  const usdcContract = await ethers.getContractAt("MockERC20", usdc);
  await (await usdcContract.mint(deployer.address, BigInt(100000 * 1e6))).wait();
  await (await usdcContract.approve(flashAddr, BigInt(100000 * 1e6))).wait();
  await (await flash.deposit(usdc, BigInt(100000 * 1e6))).wait();
  console.log("Flash pool seeded with 100k USDC");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("GAD:", gadAddr);
  console.log("Flash:", flashAddr);
  console.log("\nUpdate these in:");
  console.log("- README.md");
  console.log("- docs/DEPLOYMENTS.md");
  console.log("- app/src/lib/evmContracts.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
