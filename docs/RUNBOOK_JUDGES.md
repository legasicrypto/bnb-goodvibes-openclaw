# Judges Runbook — Legasi (BNB Chain Hackathon)

This is the **single source of truth** for the live demo.

- Demo URL: https://bnb.legasi.io
- Network: **BNB Smart Chain Testnet** (chainId **97**)
- Explorer: https://testnet.bscscan.com

## 0) Pre-flight checklist (DO THIS BEFORE YOU SCREENSHARE)

### Wallet / network
- [ ] MetaMask installed
- [ ] MetaMask set to **BNB Smart Chain Testnet**
- [ ] You have a bit of **tBNB** for gas

### App health
- [ ] Open https://bnb.legasi.io
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Connect wallet successfully

### On-chain health (optional but recommended)
From repo root:

```bash
npm run smoke:bsc
```

If this fails: **stop** and fix RPC / addresses before demo.

---

## 1) Demo narrative (what you say)

**Thesis:** AI agents need a native payment + credit primitive to buy services autonomously.

Legasi on BNB chain delivers:
- **Credit lines** (borrow USDC against collateral)
- **Reputation** (repayment improves score)
- **LP yield vault** (liquidity provisioning)
- **x402 receipts** (HTTP 402 payment primitive)
- **GAD** (gradual deleveraging vs brutal liquidation)

BNB chain choice: low fees + fast finality → viable for high-frequency agent actions.

---

## 2) Live demo flow (5–7 minutes)

### A) Faucet (60s)
1. Go to: https://bnb.legasi.io/faucet
2. Click **Mint All Tokens**
   - This mints **mUSDC / mWETH / mWBTC** directly to your wallet.

If mint fails:
- Reconnect wallet
- Verify chainId=97
- Retry token-by-token (Mint USDC, Mint WETH, Mint WBTC)

### B) Credit flow (2–3 min)
1. Go to **Dashboard**
2. **Supply collateral** (WETH)
   - Approve (tx 1)
   - Deposit (tx 2)
3. **Borrow mUSDC**
4. **Repay mUSDC**
   - Show the **Reputation** / score increased after repay
5. **Withdraw collateral**

### C) LP flow (60–90s)
1. Switch to **LP** tab/section
2. Deposit mUSDC
3. Withdraw shares

### D) x402 & GAD (60s)
- Explain x402 receipts + show contract address in docs
- Explain GAD: gradual deleveraging vs hard liquidation

---

## 3) Plan B (if something goes wrong)

### RPC instability
- Use another public RPC in the frontend env (NEXT_PUBLIC_RPC_URL) and redeploy frontend.
- For the demo itself: switch wallet RPC (if configured) or retry after 10–20s.

### Token mismatch after redeploy
- Go back to faucet and mint again (fresh tokens).

### Worst case
- Show on-chain contracts in BscScan + run tests locally (15/15 passing) + walk through docs/DEMO_FLOW.md.

---

## 4) Deployments (BSC testnet)

See: `docs/DEPLOYMENTS.md`
