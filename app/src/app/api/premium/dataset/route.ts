import { NextResponse } from "next/server";
import { addrHeader, makeChallenge, mustBeBscTestnet, priceUsd6, verifyPaid } from "@/lib/x402";

const AMOUNT_USDC_6 = priceUsd6("X402_PRICE_DATASET_USDC", "2");

export async function GET(req: Request) {
  mustBeBscTestnet();

  const payer = addrHeader(req, "x-legasi-payer");
  const paymentId = (req.headers.get("x-legasi-payment-id") || "").trim() as `0x${string}`;
  const sig = (req.headers.get("x-legasi-signature") || "").trim() as `0x${string}`;

  const resource = "/api/premium/dataset";

  if (!payer || !paymentId || !sig) {
    if (!payer) return NextResponse.json({ error: "missing_payer" }, { status: 401 });
    return NextResponse.json({ error: "payment_required", x402: makeChallenge({ resource, payer, amountUsd6: AMOUNT_USDC_6 }) }, { status: 402 });
  }

  try {
    const v = await verifyPaid({ resource, payer, paymentId, signature: sig, amountUsd6: AMOUNT_USDC_6 });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.error === "signature_mismatch" ? 401 : 402 });

    // Premium dataset payload (static, judge-friendly, but behind paywall)
    const dataset = {
      version: "2026-02-18",
      schema: "legasi.agent-credit.v1",
      samples: [
        { agent: "ArbitrageBot", score: 82, dailyLimitUsd6: 20000000000, aprBps: 500 },
        { agent: "MarketMaker", score: 67, dailyLimitUsd6: 5000000000, aprBps: 700 },
        { agent: "NewAgent", score: 12, dailyLimitUsd6: 1000000000, aprBps: 900 },
      ],
      explanation: [
        "Dataset represents off-chain signals distilled into on-chain-friendly credit terms.",
        "Access is monetized via x402 receipts (mUSDC) and verifiable on-chain.",
      ],
    };

    return NextResponse.json({
      ok: true,
      premium: {
        type: "dataset",
        paidBy: payer,
        paidAt: v.paidAt.toString(),
        paymentId,
        receiptContract: v.receiptContract,
      },
      dataset,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error", detail: e?.message }, { status: 500 });
  }
}
