'use client';

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits } from "viem";
import { CONTRACTS } from "@/lib/evmContracts";

const mintAbi = [
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
] as const;

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  const [wethAmount, setWethAmount] = useState("10");
  const [wbtcAmount, setWbtcAmount] = useState("0.1");
  const [usdcAmount, setUsdcAmount] = useState("1000");
  const [status, setStatus] = useState<string | null>(null);

  const weth = CONTRACTS.weth as `0x${string}`;
  const wbtc = CONTRACTS.wbtc as `0x${string}`;
  const usdc = CONTRACTS.usdc as `0x${string}`;

  const mint = async (token: `0x${string}`, amount: string, decimals: number, label: string) => {
    if (!address) return;
    setStatus(`Minting ${label}...`);
    try {
      const hash = await writeContractAsync({ address: token, abi: mintAbi, functionName: "mint", args: [address, parseUnits(amount || "0", decimals)] });
      setStatus(`${label} minted — ${hash.slice(0, 10)}…`);
    } catch (e: any) {
      console.error('mint failed', e);
      setStatus(`${label} mint failed — ${e?.shortMessage || e?.message || 'unknown error'}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#001520] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Faucet</h1>
        <p className="mt-2 text-[#8a9aa8]">Mint test tokens for demo.</p>
        <div className="mt-4 p-3 bg-[#FF4E00]/10 border border-[#FF4E00]/30 rounded-xl text-sm text-[#FF4E00] flex items-start gap-2">
          <svg className="h-5 w-5 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M10.3 4.6l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <div>If contracts were redeployed, your old tokens are invalid. Mint fresh tokens here.</div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {!isConnected ? (
            <button className="h-10 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={() => connect({ connector: injected() })}>Connect MetaMask</button>
          ) : (
            <>
              <button className="h-10 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={() => disconnect()}>{address?.slice(0, 6)}…{address?.slice(-4)}</button>
              <span className="text-sm text-[#8a9aa8]">Connected</span>
            </>
          )}
        </div>

        <div className="mt-8 space-y-6">
          <div className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="text-sm text-[#8a9aa8] mb-2">WETH (mWETH)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#001520] border border-[#0a2535] rounded-xl px-4 text-white" value={wethAmount} onChange={(e) => setWethAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(weth, wethAmount, 6, "WETH")}>Mint WETH</button>
            </div>
          </div>

          <div className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="text-sm text-[#8a9aa8] mb-2">WBTC (mWBTC)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#001520] border border-[#0a2535] rounded-xl px-4 text-white" value={wbtcAmount} onChange={(e) => setWbtcAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(wbtc, wbtcAmount, 8, "WBTC")}>Mint WBTC</button>
            </div>
          </div>

          <div className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
            <div className="text-sm text-[#8a9aa8] mb-2">mUSDC (mock USDC)</div>
            <div className="flex gap-3">
              <input className="flex-1 h-12 bg-[#001520] border border-[#0a2535] rounded-xl px-4 text-white" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} />
              <button className="h-12 px-5 bg-[#4ade80] hover:bg-[#22c55e] text-black rounded-xl font-semibold" disabled={!isConnected} onClick={() => mint(usdc, usdcAmount, 6, "mUSDC")}>Mint mUSDC</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button 
            className="w-full h-14 bg-gradient-to-r from-[#FF4E00] to-[#FF7E00] hover:from-[#E64500] hover:to-[#E67400] text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02]" 
            disabled={!isConnected}
            onClick={async () => {
              setStatus("Minting all tokens...");
              try {
                await mint(weth, wethAmount, 6, "WETH");
                await mint(wbtc, wbtcAmount, 8, "WBTC");
                await mint(usdc, usdcAmount, 6, "mUSDC");
                setStatus("All tokens minted ✓");
              } catch {
                setStatus("Some mints failed");
              }
            }}
          >
            <span className="inline-flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 19l14-7L5 5v14z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M19 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Mint All Tokens
            </span>
          </button>
        </div>

        {status && <div className="mt-4 text-sm text-[#8a9aa8]">{status}</div>}
      </div>
    </main>
  );
}
