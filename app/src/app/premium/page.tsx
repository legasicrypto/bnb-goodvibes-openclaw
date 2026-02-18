"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect, usePublicClient, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, toHex, formatUnits } from "viem";
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
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
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
  chainId: number;
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

export default function PremiumPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#001520] text-white px-6 py-16"><div className="max-w-3xl mx-auto text-[#8a9aa8]">Loading…</div></main>}>
      <PremiumInner />
    </Suspense>
  );
}

function PremiumInner() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPaymentTx, setLastPaymentTx] = useState<`0x${string}` | null>(null);
  const [lastApproveTx, setLastApproveTx] = useState<`0x${string}` | null>(null);

  const payer = address as `0x${string}` | undefined;

  const searchParams = useSearchParams();
  const mode = (searchParams.get("mode") || "").trim();

  const lending = CONTRACTS.lending as `0x${string}`;

  const routes = useMemo(() => ([
    { key: "compute", name: "Compute", path: "/api/premium/compute" },
    { key: "quote", name: "Quote", path: "/api/premium/quote" },
    { key: "agent-config", name: "Agent Config", path: "/api/premium/agent-config" },
    { key: "dataset", name: "Dataset", path: "/api/premium/dataset" },
  ]), []);

  const [selected, setSelected] = useState(routes[0]!.path);

  useEffect(() => {
    const ep = (searchParams.get("endpoint") || "").trim();
    if (!ep) return;
    const found = routes.find((r) => r.key === ep);
    if (found) setSelected(found.path);
  }, [searchParams, routes]);

  const { data: usdcBalanceRaw, refetch: refetchUsdc } = useReadContract({
    address: CONTRACTS.usdc as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [payer ?? "0x0000000000000000000000000000000000000000"],
  });
  const usdcBalance = usdcBalanceRaw ? Number(formatUnits(usdcBalanceRaw, 6)) : 0;

  const fetchPremium = useCallback(async (headers?: Record<string, string>) => {
    setError(null);
    setLastApproveTx(null);
    setLastPaymentTx(null);
    setStatus("Requesting premium endpoint...");

    const res = await fetch(selected, {
      method: "GET",
      headers: {
        ...(payer ? { "x-legasi-payer": payer } : {}),
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
  }, [payer]);

  useEffect(() => {
    // attempt to load challenge on page view / endpoint change
    fetchPremium();
  }, [fetchPremium, selected]);

  const payAndUnlock = useCallback(async () => {
    if (!payer) {
      setError("Connect wallet first.");
      return;
    }
    if (!challenge) {
      setError("No challenge to pay.");
      return;
    }

    try {
      // Optional mode: borrow missing mUSDC from Legasi before paying.
      if (mode === "borrowpay") {
        setStatus("Ensuring agent policy (x402Enabled)...");
        await writeContractAsync({
          address: lending,
          abi: lendingAbi,
          functionName: "configureAgent",
          args: [BigInt(5_000_000_000), true, true], // $5,000/day (usd6)
        });

        setStatus("Ensuring position exists...");
        try {
          await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "initializePosition" });
        } catch {}

        await refetchUsdc();
        const need = Number(challenge.amount) / 1e6;
        if (usdcBalance < need) {
          const delta = BigInt(challenge.amount) - BigInt(usdcBalanceRaw ?? BigInt(0));
          if (delta > BigInt(0)) {
            setStatus(`Borrowing ${Number(delta) / 1e6} mUSDC...`);
            const bh = await writeContractAsync({
              address: lending,
              abi: lendingAbi,
              functionName: "borrow",
              args: [challenge.token, delta],
            });
            if (publicClient) await publicClient.waitForTransactionReceipt({ hash: bh });
          }
        }
      }

      setStatus("Signing x402 message...");
      const signature = await signMessageAsync({ message: challenge.signingMessage });

      setStatus("Approving mUSDC...");
      const approveHash = await writeContractAsync({
        address: challenge.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [challenge.contract, BigInt(challenge.amount)],
      });
      setLastApproveTx(approveHash);
      setStatus("Waiting approval confirmation...");
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setStatus("Paying (on-chain receipt)...");
      const payHash = await writeContractAsync({
        address: challenge.contract,
        abi: x402V2Abi,
        functionName: "pay",
        args: [
          challenge.paymentId,
          challenge.resourceHash,
          challenge.recipient,
          challenge.token,
          BigInt(challenge.amount),
          BigInt(challenge.expiresAt),
        ],
      });
      setLastPaymentTx(payHash);
      setStatus("Waiting payment confirmation...");
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: payHash });

      setStatus("Retrying premium request...");
      await fetchPremium({
        "x-legasi-payment-id": challenge.paymentId,
        "x-legasi-signature": signature,
      });

      // Persist proof so dashboard can show premium sections as unlocked (session-local, best-effort).
      try {
        const ep = (selected.split("/").pop() || "").trim();
        const key = ep === "compute" ? "compute" : ep === "quote" ? "quote" : ep === "agent-config" ? "agent-config" : ep === "dataset" ? "dataset" : "";
        if (key && payer) {
          localStorage.setItem(
            `legasi:x402:${key}`,
            JSON.stringify({ paymentId: challenge.paymentId, signature, payer, ts: Date.now() })
          );
        }
      } catch {}

    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Payment failed");
      setStatus(null);
    }
  }, [payer, challenge, fetchPremium, signMessageAsync, writeContractAsync, publicClient, mode, lending, usdcBalance, usdcBalanceRaw, refetchUsdc]);

  return (
    <main className="min-h-screen bg-[#001520] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Premium APIs (x402)</h1>
            <p className="mt-2 text-[#8a9aa8]">Paywall multiple premium endpoints using HTTP 402 + on-chain mUSDC receipts (BNB testnet).</p>
          </div>
          <Link className="text-sm text-[#FF4E00] hover:underline" href="/dashboard">← Back to Dashboard</Link>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {!isConnected ? (
            <button className="h-10 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={() => connect({ connector: injected() })}>
              Connect MetaMask
            </button>
          ) : (
            <>
              <button className="h-10 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={() => disconnect()}>
                {payer?.slice(0, 6)}…{payer?.slice(-4)}
              </button>
              <span className="text-sm text-[#8a9aa8]">Connected</span>
              <Link className="ml-auto text-sm text-[#8a9aa8] hover:text-white" href="/faucet">Need tokens? Faucet →</Link>
            </>
          )}
        </div>

        {status && <div className="mt-6 p-4 bg-[#051525]/80 border border-[#0a2535] rounded-2xl text-sm text-[#8a9aa8]">{status}</div>}
        {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-sm text-red-300">{error}</div>}

        {(lastApproveTx || lastPaymentTx) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {lastApproveTx && (
              <a
                className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl text-[#8a9aa8] hover:text-white"
                href={`https://testnet.bscscan.com/tx/${lastApproveTx}`}
                target="_blank"
                rel="noreferrer"
              >
                <div className="font-semibold text-white">Approve tx</div>
                <div className="break-all mt-1">{lastApproveTx}</div>
              </a>
            )}
            {lastPaymentTx && (
              <a
                className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl text-[#8a9aa8] hover:text-white"
                href={`https://testnet.bscscan.com/tx/${lastPaymentTx}`}
                target="_blank"
                rel="noreferrer"
              >
                <div className="font-semibold text-white">Payment tx (x402 receipt)</div>
                <div className="break-all mt-1">{lastPaymentTx}</div>
              </a>
            )}
          </div>
        )}

        <div className="mt-8 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-[#8a9aa8]">Select premium endpoint</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {routes.map((r) => (
                  <button
                    key={r.key}
                    className={`h-10 px-4 rounded-xl border text-sm font-semibold ${selected === r.path ? "bg-[#FF4E00] border-[#FF4E00] text-white" : "bg-[#001520] border-[#0a2535] text-[#8a9aa8] hover:text-white"}`}
                    onClick={() => setSelected(r.path)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="h-10 px-4 bg-[#001520] border border-[#0a2535] hover:border-[#FF4E00]/50 text-white rounded-xl font-semibold"
              onClick={() => fetchPremium()}
            >
              Refresh
            </button>
          </div>
        </div>

        {challenge && (
          <div className="mt-6 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Payment Required (402)</div>
                <div className="mt-1 text-sm text-[#8a9aa8]">Pay with mUSDC to unlock this premium compute response.</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#8a9aa8]">Price</div>
                <div className="text-2xl font-bold">{Number(challenge.amount) / 1e6} mUSDC</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#8a9aa8]">
              <div className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl">
                <div className="font-semibold text-white">PaymentId</div>
                <div className="break-all mt-1">{challenge.paymentId}</div>
              </div>
              <div className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl">
                <div className="font-semibold text-white">Receipt Contract</div>
                <div className="break-all mt-1">{challenge.contract}</div>
              </div>
              <div className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl">
                <div className="font-semibold text-white">Recipient</div>
                <div className="break-all mt-1">{challenge.recipient}</div>
              </div>
              <div className="p-3 bg-[#001520] border border-[#0a2535] rounded-xl">
                <div className="font-semibold text-white">Token</div>
                <div className="break-all mt-1">{challenge.token}</div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                className="h-12 px-5 bg-gradient-to-r from-[#FF4E00] to-[#FF7E00] hover:from-[#E64500] hover:to-[#E67400] text-white rounded-xl font-bold"
                disabled={!isConnected}
                onClick={payAndUnlock}
              >
                Pay with mUSDC → Unlock
              </button>
            </div>

            <div className="mt-4 text-xs text-[#8a9aa8]">
              You will sign a message (auth), approve mUSDC, then send a payment tx that emits an on-chain x402 receipt.
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="text-lg font-semibold">Premium Response</div>
              {challenge?.contract && (
                <a
                  className="text-sm text-[#FF4E00] hover:underline"
                  href={`https://testnet.bscscan.com/address/${challenge.contract}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View receipt contract on BscScan →
                </a>
              )}
            </div>
            <pre className="mt-3 text-xs bg-[#001520] border border-[#0a2535] rounded-xl p-4 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 text-xs text-[#8a9aa8]">
          Tip: this is how agents buy API access autonomously — 402 challenge → on-chain payment → retry with receipt proof.
        </div>
      </div>
    </main>
  );
}
