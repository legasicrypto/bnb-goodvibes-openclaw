"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Proof = { paymentId: string; signature: string; payer: string; ts: number };

function IconSpark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l1.3 5.1L18 9l-4.7 1.9L12 16l-1.3-5.1L6 9l4.7-1.9L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M4 14l.8 3.2L8 18l-3.2.8L4 22l-.8-3.2L0 18l3.2-.8L4 14z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 11V8a5 5 0 0110 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M6.5 11h11A2.5 2.5 0 0120 13.5v6A2.5 2.5 0 0117.5 22h-11A2.5 2.5 0 014 19.5v-6A2.5 2.5 0 016.5 11z" stroke="currentColor" strokeWidth="2.2"/>
      <path d="M12 16v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

const endpoints = [
  { key: "compute", title: "Premium Compute", desc: "Risk score + recommended limits", href: "/premium?endpoint=compute", hrefBorrow: "/premium?endpoint=compute&mode=borrowpay" },
  { key: "quote", title: "Pro Terms", desc: "Tiered pricing, APR & limits", href: "/premium?endpoint=quote", hrefBorrow: "/premium?endpoint=quote&mode=borrowpay" },
  { key: "agent-config", title: "Pro Agent Limits", desc: "Policy JSON + controls", href: "/premium?endpoint=agent-config", hrefBorrow: "/premium?endpoint=agent-config&mode=borrowpay" },
  { key: "dataset", title: "Export Dataset", desc: "Premium feed (JSON)", href: "/premium?endpoint=dataset", hrefBorrow: "/premium?endpoint=dataset&mode=borrowpay" },
] as const;

function readProof(key: string): Proof | null {
  try {
    const raw = localStorage.getItem(`legasi:x402:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function PremiumSection() {
  const [proofs, setProofs] = useState<Record<string, Proof | null>>({});

  useEffect(() => {
    const p: Record<string, Proof | null> = {};
    for (const e of endpoints) p[e.key] = readProof(e.key);
    setProofs(p);

    const onStorage = () => {
      const pp: Record<string, Proof | null> = {};
      for (const e of endpoints) pp[e.key] = readProof(e.key);
      setProofs(pp);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="lg:col-span-3 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm card-shine">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#FF4E00]"><IconSpark /></span>
            <h3 className="text-xl font-semibold">Premium (x402 Paywall)</h3>
          </div>
          <p className="text-sm text-[#6a7a88] mt-1">Unlock premium features with mUSDC via HTTP 402 + on-chain receipts.</p>
        </div>
        <Link className="text-sm text-[#FF4E00] hover:underline" href="/premium">Open Premium Hub →</Link>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        {endpoints.map((x) => {
          const unlocked = !!proofs[x.key];
          return (
            <div key={x.key} className="p-4 bg-[#001520] border border-[#0a2535] rounded-xl">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{x.title}</div>
                {!unlocked && <span className="text-[#6a7a88]"><IconLock /></span>}
              </div>
              <div className="text-xs text-[#6a7a88] mt-1">{x.desc}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link className="text-sm font-semibold text-white bg-[#FF4E00] hover:bg-[#E64500] px-3 py-2 rounded-lg" href={x.href}>
                  {unlocked ? "View" : "Unlock via x402"}
                </Link>
                {!unlocked && (
                  <Link className="text-sm font-semibold text-white bg-[#0a2535] hover:bg-[#123247] px-3 py-2 rounded-lg" href={x.hrefBorrow}>
                    Borrow & Unlock
                  </Link>
                )}
                {unlocked && <span className="text-xs text-[#8a9aa8]">Unlocked</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
