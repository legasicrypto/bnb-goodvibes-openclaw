import { NextResponse } from "next/server";
import { addrHeader, makeChallenge, mustBeBscTestnet, priceUsd6, verifyPaid } from "@/lib/x402";

const AMOUNT_USDC_6 = priceUsd6("X402_PRICE_AGENTCFG_USDC", "1");

export async function GET(req: Request) {
  mustBeBscTestnet();

  const payer = addrHeader(req, "x-legasi-payer");
  const paymentId = (req.headers.get("x-legasi-payment-id") || "").trim() as `0x${string}`;
  const sig = (req.headers.get("x-legasi-signature") || "").trim() as `0x${string}`;

  const resource = "/api/premium/agent-config";

  if (!payer || !paymentId || !sig) {
    if (!payer) return NextResponse.json({ error: "missing_payer" }, { status: 401 });
    return NextResponse.json({ error: "payment_required", x402: makeChallenge({ resource, payer, amountUsd6: AMOUNT_USDC_6 }) }, { status: 402 });
  }

  try {
    const v = await verifyPaid({ resource, payer, paymentId, signature: sig, amountUsd6: AMOUNT_USDC_6, requireX402Enabled: true });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.error === "signature_mismatch" ? 401 : 402 });

    // Premium agent config payload
    return NextResponse.json({
      ok: true,
      premium: {
        type: "agent-config",
        paidBy: payer,
        paidAt: v.paidAt.toString(),
        paymentId,
        receiptContract: v.receiptContract,
        agentConfig: {
          dailyBorrowLimitUsd6: "5000000000",
          autoRepayEnabled: true,
          x402Enabled: true,
          riskControls: {
            maxOpenPositions: 3,
            maxLtvBps: 7000,
            cooldownSeconds: 60,
          },
          notes: [
            "This is what an agent would fetch after paying an API fee via x402.",
            "You can then apply these params on-chain via configureAgent().",
          ],
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "server_error", detail: e?.message }, { status: 500 });
  }
}
