import { ethers } from "hardhat";

// Best-effort: if env not set, we use the same defaults as the frontend.
const clean = (v: string | undefined, fallback: string) => (v && v.trim().length ? v.trim() : fallback);

const ADDRS = {
  core: clean(process.env.NEXT_PUBLIC_CORE, "0x7C3dd137c13653aaa8457A220aa4B586a30AD7F6"),
  lending: clean(process.env.NEXT_PUBLIC_LENDING, "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7"),
  lp: clean(process.env.NEXT_PUBLIC_LP, "0xDd5605472769C91C3592023A445f1B4aB0cAED7a"),
  gad: clean(process.env.NEXT_PUBLIC_GAD, "0x0eD2B07885Bb42D36d910857b02A5c797BcF8724"),
  reputation: clean(process.env.NEXT_PUBLIC_REPUTATION, "0x02c0B1A438eCccD978D11889f19cd20A5584fBFf"),
  x402: clean(process.env.NEXT_PUBLIC_X402, "0x988aA233bc27d60110c6026897d7e41F4C6D3C7c"),
  usdc: clean(process.env.NEXT_PUBLIC_USDC, "0x31C007fD6597748dacde1e243A8ef1C083bbC8F4"),
  weth: clean(process.env.NEXT_PUBLIC_WETH, "0x040Cc7C35B5ea611519e3AB6389632dc690ee701"),
  wbtc: clean(process.env.NEXT_PUBLIC_WBTC, "0xFCD7E225F9aeF687e3d2E3b90f62e7dCDf2Af9C3"),
} as const;

async function assertHasCode(label: string, addr: string) {
  const code = await ethers.provider.getCode(addr);
  if (!code || code === "0x") {
    throw new Error(`${label} has no bytecode at ${addr}`);
  }
}

async function main() {
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== 97) {
    throw new Error(`Wrong network: expected chainId=97 (BSC testnet), got ${net.chainId}`);
  }

  console.log(`\n[smoke] network chainId=${net.chainId}`);

  // 1) Bytecode presence
  await Promise.all([
    assertHasCode("LegasiCore", ADDRS.core),
    assertHasCode("LegasiLending", ADDRS.lending),
    assertHasCode("LegasiLP", ADDRS.lp),
    assertHasCode("LegasiGAD", ADDRS.gad),
    assertHasCode("ReputationRegistry", ADDRS.reputation),
    assertHasCode("X402Receipt", ADDRS.x402),
    assertHasCode("mUSDC", ADDRS.usdc),
    assertHasCode("mWETH", ADDRS.weth),
    assertHasCode("mWBTC", ADDRS.wbtc),
  ]);
  console.log("[smoke] bytecode: OK");

  // 2) Wiring sanity checks
  const lending = await ethers.getContractAt("LegasiLending", ADDRS.lending);
  const coreFromLending = await lending.core();
  const repFromLending = await lending.reputation();
  if (coreFromLending.toLowerCase() !== ADDRS.core.toLowerCase()) throw new Error(`LegasiLending.core mismatch: ${coreFromLending} != ${ADDRS.core}`);
  if (repFromLending.toLowerCase() !== ADDRS.reputation.toLowerCase()) throw new Error(`LegasiLending.reputation mismatch: ${repFromLending} != ${ADDRS.reputation}`);
  console.log("[smoke] lending wiring: OK");

  const lp = await ethers.getContractAt("LegasiLP", ADDRS.lp);
  const lpAsset = await lp.asset();
  if (lpAsset.toLowerCase() !== ADDRS.usdc.toLowerCase()) throw new Error(`LegasiLP.asset mismatch: ${lpAsset} != ${ADDRS.usdc}`);
  console.log("[smoke] lp wiring: OK");

  // 3) Token metadata sanity
  const usdc = await ethers.getContractAt("MockERC20", ADDRS.usdc);
  const weth = await ethers.getContractAt("MockERC20", ADDRS.weth);
  const wbtc = await ethers.getContractAt("MockERC20", ADDRS.wbtc);

  const [usdcDec, wethDec, wbtcDec] = await Promise.all([usdc.decimals(), weth.decimals(), wbtc.decimals()]);
  if (usdcDec !== 6n) throw new Error(`mUSDC decimals mismatch: ${usdcDec} != 6`);
  if (wethDec !== 6n) throw new Error(`mWETH decimals mismatch: ${wethDec} != 6`);
  if (wbtcDec !== 8n) throw new Error(`mWBTC decimals mismatch: ${wbtcDec} != 8`);
  console.log("[smoke] token decimals: OK");

  console.log("\n[smoke] ALL CHECKS PASSED ✅\n");
  console.log("Addresses:");
  console.table(ADDRS);
}

main().catch((e) => {
  console.error("\n[smoke] FAILED ❌\n", e);
  process.exitCode = 1;
});
