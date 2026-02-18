"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS } from "@/lib/evmContracts";

const lendingAbi = [
  { name: "initializePosition", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "borrow", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "configureAgent", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "dailyLimitUsd6", type: "uint256" },
    { name: "autoRepay", type: "bool" },
    { name: "x402", type: "bool" },
  ], outputs: [] },
] as const;

const erc20Abi = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "spender", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [{ name: "ok", type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
  ], outputs: [{ name: "", type: "uint256" }] },
] as const;

const x402V2Abi = [
  {
    name: "pay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentId", type: "bytes32" },
      { name: "resourceHash", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiresAt", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

type Challenge = {
  resource: string;
  resourceHash: `0x${string}`;
  paymentId: `0x${string}`;
  contract: `0x${string}`;
  recipient: `0x${string}`;
  token: `0x${string}`;
  amount: string;
  decimals: number;
  expiresAt: string;
  signingMessage: string;
};

type EndpointKey = "compute" | "quote" | "agent-config" | "dataset";

const endpointToPath: Record<EndpointKey, string> = {
  compute: "/api/premium/compute",
  quote: "/api/premium/quote",
  "agent-config": "/api/premium/agent-config",
  dataset: "/api/premium/dataset",
};

export default function InlinePremiumModal({
  open,
  endpoint,
  onClose,
}: {
  open: boolean;
  endpoint: EndpointKey;
  onClose: () => void;
}) {
  const { address, isConnected } = useAccount();
  const payer = address as `0x${string}` | undefined;

  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const lending = CONTRACTS.lending as `0x${string}`;
  const usdc = CONTRACTS.usdc as `0x${string}`;
  const x402v2 = (CONTRACTS as any).x402v2 ? ((CONTRACTS as any).x402v2 as `0x${string}`) : (CONTRACTS.x402 as `0x${string}`);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<any>(null);
  const [approveTx, setApproveTx] = useState<`0x${string}` | null>(null);
  const [payTx, setPayTx] = useState<`0x${string}` | null>(null);
  const [borrowTx, setBorrowTx] = useState<`0x${string}` | null>(null);

  const { data: usdcBalRaw, refetch: refetchUsdc } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payer ?? "0x0000000000000000000000000000000000000000"],
  });

  const reset = useCallback(() => {
    setStatus(null);
    setError(null);
    setChallenge(null);
    setResult(null);
    setApproveTx(null);
    setPayTx(null);
    setBorrowTx(null);
  }, []);

  const fetchPremium = useCallback(async (headers?: Record<string, string>) => {
    if (!payer) return;
    const path = endpointToPath[endpoint];

    setStatus("Requesting premium endpoint...");
    const res = await fetch(path, {
      method: "GET",
      headers: {
        "x-legasi-payer": payer,
        ...(headers || {}),
      },
    });

    const json = await res.json().catch(() => null);

    if (res.status === 402) {
      setChallenge(json?.x402 || null);
      setResult(null);
      setStatus("Payment required (402).");
      return;
    }

    if (!res.ok) {
      setError(json?.error || `Request failed (${res.status})`);
      setStatus(null);
      return;
    }

    setChallenge(null);
    setResult(json);
    setStatus("Access granted ✓");
  }, [endpoint, payer]);

  useEffect(() => {
    if (!open) return;
    reset();
    if (payer) fetchPremium();
  }, [open, payer, endpoint, fetchPremium, reset]);

  const autoUnlock = useCallback(async () => {
    if (!isConnected || !payer) {
      setError("Connect wallet first.");
      return;
    }
    if (!challenge) {
      setError("No x402 challenge yet. Click refresh.");
      return;
    }

    try {
      setError(null);

      // 1) Ensure policy gate is on
      setStatus("Enabling x402 policy (Agent Configuration)...");
      const cfgHash = await writeContractAsync({
        address: lending,
        abi: lendingAbi,
        functionName: "configureAgent",
        args: [BigInt(5_000_000_000), true, true],
      });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: cfgHash });

      // 2) Ensure position exists (best-effort)
      setStatus("Ensuring position exists...");
      try {
        const ih = await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "initializePosition" });
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash: ih });
      } catch {}

      // 3) Borrow missing USDC
      await refetchUsdc();
      const have = usdcBalRaw ?? BigInt(0);
      const need = BigInt(challenge.amount);
      if (have < need) {
        const delta = need - have;
        setStatus(`Borrowing ${Number(delta) / 1e6} mUSDC...`);
        const bh = await writeContractAsync({
          address: lending,
          abi: lendingAbi,
          functionName: "borrow",
          args: [challenge.token, delta],
        });
        setBorrowTx(bh);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash: bh });
      }

      // 4) Sign auth
      setStatus("Signing x402 message...");
      const signature = await signMessageAsync({ message: challenge.signingMessage });

      // 5) Approve + pay
      setStatus("Approving mUSDC...");
      const ah = await writeContractAsync({
        address: challenge.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [challenge.contract, need],
      });
      setApproveTx(ah);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: ah });

      setStatus("Paying (on-chain receipt)...");
      const ph = await writeContractAsync({
        address: x402v2,
        abi: x402V2Abi,
        functionName: "pay",
        args: [
          challenge.paymentId,
          challenge.resourceHash,
          challenge.recipient,
          challenge.token,
          need,
          BigInt(challenge.expiresAt),
        ],
      });
      setPayTx(ph);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: ph });

      setStatus("Retrying premium request...");
      await fetchPremium({
        "x-legasi-payment-id": challenge.paymentId,
        "x-legasi-signature": signature,
      });

      // Persist proof for dashboard cards
      try {
        localStorage.setItem(
          `legasi:x402:${endpoint}`,
          JSON.stringify({ paymentId: challenge.paymentId, signature, payer, ts: Date.now() })
        );
      } catch {}

    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Auto unlock failed");
      setStatus(null);
    }
  }, [challenge, endpoint, fetchPremium, isConnected, lending, payer, publicClient, refetchUsdc, signMessageAsync, usdcBalRaw, writeContractAsync, x402v2]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(820px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#0a2535] bg-[#001520] shadow-2xl">
        <div className="p-5 border-b border-[#0a2535] flex items-center justify-between">
          <div>
            <div className="text-sm text-[#6a7a88]">One-click Premium</div>
            <div className="text-lg font-semibold">{endpointToPath[endpoint]}</div>
          </div>
          <button className="text-[#8a9aa8] hover:text-white" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {!isConnected && <div className="text-sm text-[#ffb4a1]">Connect wallet first.</div>}

          {status && <div className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-xl text-sm text-[#8a9aa8]">{status}</div>}
          {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-200">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <button className="h-11 px-4 rounded-xl bg-[#0a2535] hover:bg-[#123247] text-white font-semibold" onClick={() => payer && fetchPremium()}>
              Refresh challenge
            </button>
            <button className="h-11 px-4 rounded-xl bg-[#FF4E00] hover:bg-[#E64500] text-white font-bold" onClick={autoUnlock}>
              Auto: Borrow → Pay → Unlock
            </button>
          </div>

          {(borrowTx || approveTx || payTx) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {borrowTx && <a className="p-3 bg-[#051525]/80 border border-[#0a2535] rounded-xl text-[#8a9aa8] hover:text-white" href={`https://testnet.bscscan.com/tx/${borrowTx}`} target="_blank" rel="noreferrer">Borrow tx</a>}
              {approveTx && <a className="p-3 bg-[#051525]/80 border border-[#0a2535] rounded-xl text-[#8a9aa8] hover:text-white" href={`https://testnet.bscscan.com/tx/${approveTx}`} target="_blank" rel="noreferrer">Approve tx</a>}
              {payTx && <a className="p-3 bg-[#051525]/80 border border-[#0a2535] rounded-xl text-[#8a9aa8] hover:text-white" href={`https://testnet.bscscan.com/tx/${payTx}`} target="_blank" rel="noreferrer">Pay tx</a>}
            </div>
          )}

          {result && (
            <div>
              <div className="text-sm font-semibold">Result</div>
              <pre className="mt-2 text-xs bg-[#000a10] border border-[#0a2535] rounded-xl p-4 overflow-auto max-h-[320px]">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          {!result && challenge && (
            <div className="text-xs text-[#6a7a88]">
              Challenge loaded. Price: {Number(challenge.amount) / 1e6} mUSDC
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
