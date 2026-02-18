"use client";

import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#001520] text-white px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Demo Runbook</h1>
            <p className="mt-2 text-[#8a9aa8]">
              A 7–10 minute, judge-friendly walkthrough: <span className="text-white">Collateral → Credit → x402 Payments → Reputation</span>.
            </p>
          </div>
          <Link className="text-sm text-[#FF4E00] hover:underline" href="/dashboard">Go to Dashboard →</Link>
        </div>

        <div className="mt-8 grid gap-4">
          <Step
            n={0}
            title="Network + wallet"
            body={
              <>
                <ul className="list-disc list-inside space-y-1">
                  <li>MetaMask on <b>BNB Smart Chain Testnet</b> (chainId <b>97</b>)</li>
                  <li>Have a bit of <b>tBNB</b> for gas</li>
                </ul>
              </>
            }
          />

          <Step
            n={1}
            title="Faucet (mint demo tokens)"
            body={
              <>
                <p className="text-[#8a9aa8]">Mint mUSDC / mWETH / mWBTC for the demo.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn" href="/faucet">Open Faucet</Link>
                </div>
              </>
            }
          />

          <Step
            n={2}
            title="Collateral → Borrow (working capital)"
            body={
              <>
                <p className="text-[#8a9aa8]">On Dashboard: supply collateral (mWETH), then borrow mUSDC.</p>
                <ul className="mt-2 list-decimal list-inside space-y-1 text-[#8a9aa8]">
                  <li>Supply collateral (approve + deposit)</li>
                  <li>Borrow mUSDC</li>
                </ul>
                <div className="mt-3">
                  <Link className="btn" href="/dashboard">Open Dashboard</Link>
                </div>
              </>
            }
          />

          <Step
            n={3}
            title="Agent Configuration (policy gate)"
            body={
              <>
                <p className="text-[#8a9aa8]">Enable x402 on-chain: the premium APIs will refuse if x402Enabled=false.</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-[#8a9aa8]">
                  <li>Click <b>Pro</b> ($5,000/day) in Agent Configuration</li>
                  <li>Confirms: auto-repay + x402 payments enabled</li>
                </ul>
              </>
            }
          />

          <Step
            n={4}
            title="Buy API access via x402 (Borrow & Unlock)"
            body={
              <>
                <p className="text-[#8a9aa8]">Premium section: pick any endpoint and use Borrow & Unlock.</p>
                <ul className="mt-2 list-decimal list-inside space-y-1 text-[#8a9aa8]">
                  <li>Click <b>Borrow & Unlock</b> on Premium Compute / Pro Terms / Agent Config / Dataset</li>
                  <li>Flow: (optional borrow) → sign message → approve mUSDC → pay() → Access granted</li>
                  <li>Show BscScan tx links + receipt contract</li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn" href="/premium">Open Premium Hub</Link>
                </div>
              </>
            }
          />

          <Step
            n={5}
            title="Repay → Reputation increases"
            body={
              <>
                <p className="text-[#8a9aa8]">Back on Dashboard: repay some/all mUSDC. Reputation score updates on-chain.</p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-[#8a9aa8]">
                  <li>Repay mUSDC</li>
                  <li>Show Reputation card: score + successful repayments</li>
                </ul>
              </>
            }
          />

          <Step
            n={6}
            title="What to say (one-liner)"
            body={
              <>
                <p className="text-[#8a9aa8]">
                  <b>Agents borrow USDC as working capital (mUSDC on testnet), then buy API access via HTTP 402 + on-chain receipts, and build reputation to unlock better credit terms.</b>
                </p>
              </>
            }
          />
        </div>

        <div className="mt-10 text-xs text-[#6a7a88]">
          Tip: this page is meant for judges — keep it open during the demo.
        </div>
      </div>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          background: #ff4e00;
          color: white;
          font-weight: 700;
        }
        .btn:hover { background: #e64500; }
      `}</style>
    </main>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-[#6a7a88]">STEP {n}</div>
          <div className="text-lg font-semibold mt-1">{title}</div>
        </div>
      </div>
      <div className="mt-3 text-sm">{body}</div>
    </div>
  );
}
