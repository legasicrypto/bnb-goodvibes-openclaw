import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const rpcUrl = process.env.BSC_TESTNET_RPC || process.env.NEXT_PUBLIC_RPC_URL || "";
const pk = process.env.DEPLOYER_PK || "";

const CONTRACTS = {
  core: process.env.NEXT_PUBLIC_CORE || "0x7C3dd137c13653aaa8457A220aa4B586a30AD7F6",
  lending: process.env.NEXT_PUBLIC_LENDING || "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7",
  lp: process.env.NEXT_PUBLIC_LP || "0xDd5605472769C91C3592023A445f1B4aB0cAED7a",
  gad: process.env.NEXT_PUBLIC_GAD || "0x0eD2B07885Bb42D36d910857b02A5c797BcF8724",
  rep: process.env.NEXT_PUBLIC_REPUTATION || "0x02c0B1A438eCccD978D11889f19cd20A5584fBFf",
  x402: process.env.NEXT_PUBLIC_X402 || "0x988aA233bc27d60110c6026897d7e41F4C6D3C7c",
  usdc: process.env.NEXT_PUBLIC_USDC || "0x31C007fD6597748dacde1e243A8ef1C083bbC8F4",
  weth: process.env.NEXT_PUBLIC_WETH || "0x040Cc7C35B5ea611519e3AB6389632dc690ee701",
} as const;

const erc20Abi = [
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
] as const;

const lendingAbi = [
  "function configureAgent(uint256 dailyLimitUsd6, bool autoRepay, bool x402) external",
  "function deposit(address token, uint256 amount) external",
] as const;

async function main() {
  if (!rpcUrl) throw new Error("Missing rpcUrl (BSC_TESTNET_RPC or NEXT_PUBLIC_RPC_URL)");
  if (!pk) throw new Error("Missing DEPLOYER_PK");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  console.log("RPC:", rpcUrl);
  console.log("Wallet:", wallet.address);

  const weth = new ethers.Contract(CONTRACTS.weth, erc20Abi, wallet);
  const usdc = new ethers.Contract(CONTRACTS.usdc, erc20Abi, wallet);
  const lending = new ethers.Contract(CONTRACTS.lending, lendingAbi, wallet);

  // 1) configure agent
  const dailyLimitUsd6 = 1000n * 1_000_000n;
  console.log("configureAgent...");
  const tx1 = await lending.configureAgent(dailyLimitUsd6, true, true);
  await tx1.wait();
  console.log("configureAgent tx:", tx1.hash);

  // 2) mint WETH + approve + deposit
  console.log("mint WETH...");
  const tx2 = await weth.mint(wallet.address, 10n * 1_000_000n); // WETH has 6 decimals in this repo
  await tx2.wait();
  console.log("mint WETH tx:", tx2.hash);

  console.log("approve WETH...");
  const tx3 = await weth.approve(CONTRACTS.lending, 10n * 1_000_000n);
  await tx3.wait();
  console.log("approve WETH tx:", tx3.hash);

  console.log("deposit WETH...");
  const tx4 = await lending.deposit(CONTRACTS.weth, 1n * 1_000_000n);
  await tx4.wait();
  console.log("deposit tx:", tx4.hash);

  const balWeth = await weth.balanceOf(wallet.address);
  const balUsdc = await usdc.balanceOf(wallet.address);
  console.log("balances:", { weth: balWeth.toString(), usdc: balUsdc.toString() });

  console.log("SMOKE_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
