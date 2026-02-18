import { createPublicClient, http, keccak256, encodePacked, parseUnits, recoverMessageAddress } from "viem";
import { bscTestnet } from "viem/chains";

export const clean = (v: string | undefined, fallback: string) => (v && v.trim().length ? v.trim() : fallback);

export const CHAIN_ID = Number(clean(process.env.NEXT_PUBLIC_CHAIN_ID, "97"));
export const RPC_URL = clean(process.env.NEXT_PUBLIC_RPC_URL, "https://bsc-testnet-rpc.publicnode.com");

export const X402 = {
  token: clean(process.env.NEXT_PUBLIC_USDC, "0x31C007fD6597748dacde1e243A8ef1C083bbC8F4") as `0x${string}`,
  contract: clean(process.env.NEXT_PUBLIC_X402_V2, "0x570BF4EdE1029c7Bc610f507c7D7a252F7328F24") as `0x${string}`,
  recipient: clean(process.env.NEXT_PUBLIC_X402_RECIPIENT, "0x44031ac1d5fB9FC2Ff441F180979d4Bcf768411D") as `0x${string}`,
  ttlSeconds: Number(clean(process.env.X402_TTL_SECONDS, "600")),
  lending: clean(process.env.NEXT_PUBLIC_LENDING, "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7") as `0x${string}`,
};

export const lendingReadAbi = [
  {
    name: "agentConfigs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "dailyBorrowLimitUsd6", type: "uint256" },
      { name: "dailyBorrowedUsd6", type: "uint256" },
      { name: "periodStart", type: "uint256" },
      { name: "autoRepayEnabled", type: "bool" },
      { name: "x402Enabled", type: "bool" },
    ],
  },
] as const;

export const x402V2Abi = [
  {
    name: "receipts",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "paymentId", type: "bytes32" }],
    outputs: [
      { name: "paymentId", type: "bytes32" },
      { name: "resourceHash", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paidAt", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
    ],
  },
] as const;

export function mustBeBscTestnet() {
  if (CHAIN_ID !== 97) throw new Error(`Misconfig: expected chainId 97, got ${CHAIN_ID}`);
}

export function addrHeader(req: Request, name: string): `0x${string}` | null {
  const v = req.headers.get(name);
  if (!v) return null;
  const s = v.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) return null;
  return s as `0x${string}`;
}

export function getPublicClient() {
  return createPublicClient({
    chain: bscTestnet,
    transport: http(RPC_URL, { timeout: 15_000 }),
  });
}

async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 3) {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // small backoff (testnet RPC flakiness)
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw new Error(`x402 rpc failed (${label}): ${lastErr?.message || lastErr}`);
}

export function makeResourceHash(resource: string) {
  return keccak256(encodePacked(["string"], [resource]));
}

export function makeChallenge({ resource, payer, amountUsd6 }: { resource: string; payer: `0x${string}`; amountUsd6: bigint; }) {
  const resourceHash = makeResourceHash(resource);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = BigInt(now + X402.ttlSeconds);

  // Deterministic payment id, bound to payer + resource + amount + expiry.
  const paymentId = keccak256(
    encodePacked(
      ["bytes32", "address", "address", "uint256", "uint256"],
      [resourceHash, payer, X402.recipient, amountUsd6, expiresAt]
    )
  );

  const signingMessage = `Legasi x402 payment for ${resource} (paymentId: ${paymentId})`;

  return {
    chainId: 97,
    resource,
    resourceHash,
    paymentId,
    contract: X402.contract,
    recipient: X402.recipient,
    token: X402.token,
    amount: amountUsd6.toString(),
    decimals: 6,
    expiresAt: expiresAt.toString(),
    headers: {
      payer: "x-legasi-payer",
      paymentId: "x-legasi-payment-id",
      signature: "x-legasi-signature",
    },
    signingMessage,
  };
}

export async function verifyPaid({
  resource,
  payer,
  paymentId,
  signature,
  amountUsd6,
  requireX402Enabled,
}: {
  resource: string;
  payer: `0x${string}`;
  paymentId: `0x${string}`;
  signature: `0x${string}`;
  amountUsd6: bigint;
  requireX402Enabled?: boolean;
}) {
  const resourceHash = makeResourceHash(resource);

  const expectedMessage = `Legasi x402 payment for ${resource} (paymentId: ${paymentId})`;
  const recovered = await recoverMessageAddress({ message: expectedMessage, signature });
  if (recovered.toLowerCase() !== payer.toLowerCase()) {
    return { ok: false as const, error: "signature_mismatch" };
  }

  const publicClient = getPublicClient();

  if (requireX402Enabled) {
    const cfg = await withRetry(
      () => publicClient.readContract({
        address: X402.lending,
        abi: lendingReadAbi,
        functionName: "agentConfigs",
        args: [payer],
      }),
      "agentConfigs"
    );
    const x402Enabled = Boolean(cfg[4]);
    if (!x402Enabled) return { ok: false as const, error: "x402_disabled" };
  }

  const receipt = await withRetry(
    () => publicClient.readContract({
      address: X402.contract,
      abi: x402V2Abi,
      functionName: "receipts",
      args: [paymentId],
    }),
    "receipts"
  );

  const [rid, rResourceHash, rPayer, rRecipient, rToken, rAmount, rPaidAt, rExpiresAt] = receipt;

  if (rid === "0x0000000000000000000000000000000000000000000000000000000000000000") return { ok: false as const, error: "receipt_not_found" };
  if (rPaidAt === BigInt(0)) return { ok: false as const, error: "unpaid" };
  if (rExpiresAt !== BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) > rExpiresAt) return { ok: false as const, error: "receipt_expired" };
  if (rPayer.toLowerCase() !== payer.toLowerCase()) return { ok: false as const, error: "payer_mismatch" };
  if (rRecipient.toLowerCase() !== X402.recipient.toLowerCase()) return { ok: false as const, error: "recipient_mismatch" };
  if (rToken.toLowerCase() !== X402.token.toLowerCase()) return { ok: false as const, error: "token_mismatch" };
  if (rAmount !== amountUsd6) return { ok: false as const, error: "amount_mismatch" };
  if (rResourceHash !== resourceHash) return { ok: false as const, error: "resource_mismatch" };

  return {
    ok: true as const,
    paidAt: rPaidAt,
    expiresAt: rExpiresAt,
    receiptContract: X402.contract,
  };
}

export function priceUsd6(envKey: string, fallbackUsd: string) {
  return parseUnits(clean(process.env[envKey], fallbackUsd), 6);
}
