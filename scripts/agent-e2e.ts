/*
  Agent E2E (BNB Testnet) — Legasi

  Best-in-class demo script:
  - Mints mock collateral + USDC
  - Deposits collateral, borrows mUSDC
  - Enables x402 in on-chain AgentConfig
  - Buys premium API access via HTTP 402 + on-chain receipt (X402USDCReceipt v2)
  - Repays and shows reputation bump

  Run:
    cd bnb-goodvibes-openclaw
    BSC_TESTNET_RPC=https://bsc-testnet-rpc.publicnode.com \
    AGENT_PK=0x... \
    node --loader ts-node/esm scripts/agent-e2e.ts

  Notes:
  - Requires the wallet to have some tBNB for gas.
*/

import { ethers } from "ethers";

const clean = (v: string | undefined, fallback?: string) => {
  const s = (v ?? "").trim();
  return s.length ? s : (fallback ?? "");
};

const RPC = clean(process.env.BSC_TESTNET_RPC, clean(process.env.NEXT_PUBLIC_RPC_URL, "https://bsc-testnet-rpc.publicnode.com"));
const AGENT_PK = clean(process.env.AGENT_PK);
if (!AGENT_PK) throw new Error("Missing AGENT_PK (private key)");

const BASE_URL = clean(process.env.PREMIUM_BASE_URL, "https://bnb.legasi.io");

// Deployed addresses (defaults are current prod/testnet)
const ADDRS = {
  lending: clean(process.env.NEXT_PUBLIC_LENDING, "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7"),
  reputation: clean(process.env.NEXT_PUBLIC_REPUTATION, "0x02c0B1A438eCccD978D11889f19cd20A5584fBFf"),
  usdc: clean(process.env.NEXT_PUBLIC_USDC, "0x31C007fD6597748dacde1e243A8ef1C083bbC8F4"),
  weth: clean(process.env.NEXT_PUBLIC_WETH, "0x040Cc7C35B5ea611519e3AB6389632dc690ee701"),
  x402v2: clean(process.env.NEXT_PUBLIC_X402_V2, "0x570BF4EdE1029c7Bc610f507c7D7a252F7328F24"),
  x402Recipient: clean(process.env.NEXT_PUBLIC_X402_RECIPIENT, "0x44031ac1d5fB9FC2Ff441F180979d4Bcf768411D"),
} as const;

const abiERC20 = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
] as const;

const abiLending = [
  "function initializePosition()",
  "function deposit(address token, uint256 amount)",
  "function borrow(address token, uint256 amount)",
  "function repay(address token, uint256 amount, uint256 amountUsd6)",
  "function configureAgent(uint256 dailyLimitUsd6, bool autoRepay, bool x402)",
  "function agentConfigs(address) view returns (uint256,uint256,uint256,bool,bool)",
] as const;

const abiReputation = [
  "function getReputation(address agent) view returns (uint256 score,uint256 successfulRepayments,uint256 totalRepaidUsd6,uint256 gadEvents,uint256 lastUpdate)",
] as const;

const abiX402V2 = [
  "function pay(bytes32 paymentId, bytes32 resourceHash, address recipient, address token, uint256 amount, uint256 expiresAt)",
] as const;

type X402Challenge = {
  chainId: number;
  resource: string;
  resourceHash: string;
  paymentId: string;
  contract: string;
  recipient: string;
  token: string;
  amount: string;
  decimals: number;
  expiresAt: string;
  signingMessage: string;
};

async function wait(tx: ethers.TransactionResponse, label: string) {
  process.stdout.write(`→ ${label}: ${tx.hash}\n`);
  const r = await tx.wait();
  process.stdout.write(`  ✓ confirmed in block ${r?.blockNumber}\n`);
  return r;
}

async function httpGet(path: string, headers: Record<string, string>) {
  const res = await fetch(`${BASE_URL}${path}`, { method: "GET", headers });
  const json = await res.json().catch(() => null);
  return { res, json };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 97) throw new Error(`Wrong chainId: expected 97, got ${network.chainId}`);

  const wallet = new ethers.Wallet(AGENT_PK as `0x${string}`, provider);
  console.log("\nAgent:", wallet.address);

  const usdc = new ethers.Contract(ADDRS.usdc, abiERC20, wallet);
  const weth = new ethers.Contract(ADDRS.weth, abiERC20, wallet);
  const lending = new ethers.Contract(ADDRS.lending, abiLending, wallet);
  const rep = new ethers.Contract(ADDRS.reputation, abiReputation, wallet);
  const x402 = new ethers.Contract(ADDRS.x402v2, abiX402V2, wallet);

  // Sanity: must have tBNB for gas
  const bal = await provider.getBalance(wallet.address);
  if (bal === 0n) {
    throw new Error(
      `Wallet has 0 tBNB for gas. Fund ${wallet.address} on BSC testnet (chainId 97) then re-run.`
    );
  }

  // 0) Ensure position exists
  try {
    await wait(await lending.initializePosition(), "initializePosition");
  } catch {
    // ignore (already exists)
  }

  // 1) Mint mock collateral + some USDC to repay later
  const mintWeth = ethers.parseUnits("5", 6); // 5 mWETH
  const mintUsdc = ethers.parseUnits("200", 6); // 200 mUSDC
  await wait(await weth.mint(wallet.address, mintWeth), "mint mWETH");
  await wait(await usdc.mint(wallet.address, mintUsdc), "mint mUSDC (wallet)"
  );

  // 2) Deposit collateral
  await wait(await weth.approve(ADDRS.lending, mintWeth), "approve mWETH → lending");
  await wait(await lending.deposit(ADDRS.weth, mintWeth), "deposit mWETH");

  // 3) Borrow mUSDC (protocol liquidity is pre-seeded)
  const borrowUsdc = ethers.parseUnits("50", 6);
  await wait(await lending.borrow(ADDRS.usdc, borrowUsdc), "borrow mUSDC");

  // 4) Configure agent policy: enable x402
  const dailyLimitUsd6 = ethers.parseUnits("5000", 6); // $5k/day
  await wait(await lending.configureAgent(dailyLimitUsd6, true, true), "configureAgent(x402Enabled=true)");

  const cfg = await lending.agentConfigs(wallet.address);
  console.log("AgentConfig:", {
    dailyBorrowLimitUsd6: cfg[0].toString(),
    autoRepayEnabled: cfg[3],
    x402Enabled: cfg[4],
  });

  // 5) Call premium API → expect 402 challenge
  const endpoint = "/api/premium/compute";
  const headersBase = { "x-legasi-payer": wallet.address };
  const { res: res0, json: json0 } = await httpGet(endpoint, headersBase);
  if (res0.status !== 402) {
    console.log("Unexpected response:", res0.status, json0);
    throw new Error("Expected 402 challenge");
  }

  const challenge: X402Challenge = json0?.x402;
  if (!challenge?.paymentId || !challenge?.signingMessage) throw new Error("Malformed x402 challenge");
  console.log("\n402 Challenge:", {
    paymentId: challenge.paymentId,
    amount: challenge.amount,
    token: challenge.token,
    contract: challenge.contract,
    expiresAt: challenge.expiresAt,
  });

  // 6) Sign auth message + approve + pay on-chain receipt
  const signature = await wallet.signMessage(challenge.signingMessage);

  const amt = BigInt(challenge.amount);
  await wait(await usdc.approve(ADDRS.x402v2, amt), "approve mUSDC → x402 v2");

  await wait(
    await x402.pay(
      challenge.paymentId,
      challenge.resourceHash,
      ADDRS.x402Recipient,
      ADDRS.usdc,
      amt,
      BigInt(challenge.expiresAt)
    ),
    "x402 pay()"
  );

  // 7) Retry premium API with proof
  const { res: res1, json: json1 } = await httpGet(endpoint, {
    ...headersBase,
    "x-legasi-payment-id": challenge.paymentId,
    "x-legasi-signature": signature,
  });

  console.log("\nPremium API response:", res1.status);
  console.log(JSON.stringify(json1, null, 2));
  if (!res1.ok) throw new Error("Premium API did not grant access");

  // 8) Repay to bump reputation
  const repBefore = await rep.getReputation(wallet.address);
  console.log("\nReputation (before repay):", {
    score: repBefore.score.toString(),
    successfulRepayments: repBefore.successfulRepayments.toString(),
    totalRepaidUsd6: repBefore.totalRepaidUsd6.toString(),
  });

  const repayAmt = ethers.parseUnits("10", 6);
  await wait(await usdc.approve(ADDRS.lending, repayAmt), "approve mUSDC → lending (repay)");
  await wait(await lending.repay(ADDRS.usdc, repayAmt, repayAmt), "repay mUSDC");

  const repAfter = await rep.getReputation(wallet.address);
  console.log("Reputation (after repay):", {
    score: repAfter.score.toString(),
    successfulRepayments: repAfter.successfulRepayments.toString(),
    totalRepaidUsd6: repAfter.totalRepaidUsd6.toString(),
  });

  console.log("\n✅ Agent E2E completed successfully\n");
}

main().catch((e) => {
  console.error("\n❌ Agent E2E failed:\n", e);
  process.exit(1);
});
