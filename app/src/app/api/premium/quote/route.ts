import { NextResponse } from "next/server";
import { addrHeader, makeChallenge, mustBeBscTestnet, priceUsd6, verifyPaid } from "@/lib/x402";

const AMOUNT_USDC_6 = priceUsd6("X402_PRICE_QUOTE_USDC", "0.5");

export async function GET(req: Request) {
  mustBeBscTestnet();

  const payer = addrHeader(req, "x-legasi-payer");
  const paymentId = (req.headers.get("x-legasi-payment-id") || "").trim() as `0x${string}`;
  const sig = (req.headers.get("x-legasi-signature") || "").trim() as `0x${string}`;

  const resource = "/api/premium/quote";

  if (!payer || !paymentId || !sig) {
    if (!payer) return NextResponse.json({ error: "missing_payer" }, { status: 401 });
    return NextResponse.json({ error: "payment_required", x402: makeChallenge({ resource, payer, amountUsd6: AMOUNT_USDC_6 }) }, { status: 402 });
  }

  try {
    const v = await verifyPaid({ resource, payer, paymentId, signature: sig, amountUsd6: AMOUNT_USDC_6 });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.error === "signature_mismatch" ? 401 : 402 });

    // Premium quote payload (judge-friendly)
    return NextResponse.json({
      ok: true,
      premium: {
        type: "quote",
        paidBy: payer,
        paidAt: v.paidAt.toString(),
        paymentId,
        receiptContract: v.receiptContract,
        quote: {
          product: "Agent Credit Line",
          currency: "USD6",
          tiers: [
            { name: "Standard", dailyLimitUsd6: "1000000000", aprBps: 900, requiresScore: 0 },
            { name: "Pro", dailyLimitUsd6: "5000000000", aprBps: 700, requiresScore: 50 },
            { name: "Prime", dailyLimitUsd6: "20000000000", aprBps: 500, requiresScore: 80 },
          ],
          rationale: [
            "Reputation-linked pricing: repay history improves APR and limits.",
            "BNB chain fees make frequent agent actions economically viable.",
          ],
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error", detail: e?.message }, { status: 500 });
  }
}
