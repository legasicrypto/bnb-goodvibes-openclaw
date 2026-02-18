"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSignMessage, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, toHex } from "viem";
import { CONTRACTS } from "@/lib/evmContracts";

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
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payer = address as `0x${string}` | undefined;

  const fetchPremium = useCallback(async (headers?: Record<string, string>) => {
    setError(null);
    setStatus("Requesting premium compute...");

    const res = await fetch("/api/premium/compute", {
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
    // attempt to load challenge on page view
    fetchPremium();
  }, [fetchPremium]);

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
      setStatus("Signing x402 message...");
      const signature = await signMessageAsync({ message: challenge.signingMessage });

      setStatus("Approving mUSDC...");
      await writeContractAsync({
        address: challenge.token,
        abi: erc20Abi,
        functionName: "approve",
        args: [challenge.contract, BigInt(challenge.amount)],
      });

      setStatus("Paying (on-chain receipt)...");
      await writeContractAsync({
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

      setStatus("Retrying premium request...");
      await fetchPremium({
        "x-legasi-payment-id": challenge.paymentId,
        "x-legasi-signature": signature,
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Payment failed");
      setStatus(null);
    }
  }, [payer, challenge, fetchPremium, signMessageAsync, writeContractAsync]);

  return (
    <main className="min-h-screen bg-[#001520] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Premium API (x402)</h1>
            <p className="mt-2 text-[#8a9aa8]">This endpoint is protected by HTTP 402 + on-chain mUSDC receipts (BNB testnet).</p>
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

        {challenge && (
          <div className="mt-8 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
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
              <button
                className="h-12 px-5 bg-[#001520] border border-[#0a2535] hover:border-[#FF4E00]/50 text-white rounded-xl font-semibold"
                onClick={() => fetchPremium()}
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 text-xs text-[#8a9aa8]">
              You will sign a message (auth), approve mUSDC, then send a payment tx that emits an on-chain x402 receipt.
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="text-lg font-semibold">Premium Response</div>
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
