import { NextResponse } from "next/server";
import { addrHeader, makeChallenge, mustBeBscTestnet, priceUsd6, verifyPaid } from "@/lib/x402";

const AMOUNT_USDC_6 = priceUsd6("X402_PRICE_USDC", "1");

export async function GET(req: Request) {
  mustBeBscTestnet();

  const payer = addrHeader(req, "x-legasi-payer");
  const paymentId = (req.headers.get("x-legasi-payment-id") || "").trim() as `0x${string}`;
  const sig = (req.headers.get("x-legasi-signature") || "").trim() as `0x${string}`;

  const resource = "/api/premium/compute";

  if (!payer || !paymentId || !sig) {
    if (!payer) return NextResponse.json({ error: "missing_payer" }, { status: 401 });
    return NextResponse.json({ error: "payment_required", x402: makeChallenge({ resource, payer, amountUsd6: AMOUNT_USDC_6 }) }, { status: 402 });
  }

  try {
    const v = await verifyPaid({ resource, payer, paymentId, signature: sig, amountUsd6: AMOUNT_USDC_6, requireX402Enabled: true });
    if (!v.ok) {
      const status = v.error === "signature_mismatch" ? 401 : v.error === "x402_disabled" ? 403 : 402;
      return NextResponse.json({ error: v.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      premium: {
        type: "compute",
        result: {
          route: resource,
          paidBy: payer,
          paidAt: v.paidAt.toString(),
          receiptContract: v.receiptContract,
          paymentId,
          message: "Access granted via x402 on-chain receipt (mUSDC on BNB testnet).",
          riskScore: 92,
          recommendedDailyLimitUsd6: "5000000000",
          notes: [
            "Reputation-linked credit terms can upgrade this limit over time.",
            "BNB chain fees make high-frequency agent commerce viable.",
          ],
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "x402_policy_unavailable" }, { status: 503 });
  }
}
