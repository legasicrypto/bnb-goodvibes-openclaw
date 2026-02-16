# Demo Flow — SKALE Hackathon

## 5-Minute Demo Script

### Setup (30s)
1. Open https://evm.legasi.io
2. Connect MetaMask on **SKALE Base Sepolia**
3. Go to **Faucet** → click **"Mint All Tokens"**

### Credit Flow (2min)
1. Go to **Dashboard**
2. **Supply Collateral**: Select WETH, enter 5, click Supply (2 signatures: approve + deposit)
3. See collateral value update (~$13,000)
4. **Borrow**: Enter 1000 USDC, click Borrow
5. See borrowed amount update + LTV health
6. **Repay**: Enter 1000, click Repay (2 signatures: approve + repay)
7. **Withdraw**: Click MAX, click Withdraw
8. Show **Reputation** card: score increased after repay

### LP Yield (1min)
1. Switch to **LP** tab
2. **Deposit**: Enter 500 USDC, click Deposit
3. See LP shares + APY display
4. **Withdraw**: Enter shares, click Withdraw

### Agent Configuration (30s)
1. Show **Agent Configuration** panel
2. Select "Standard" ($1,000/day) or "Pro" ($5,000/day)
3. Explain: agents can borrow autonomously within limits

### Key Differentiators (1min)
- **Zero gas**: SKALE provides gasless transactions
- **Reputation on-chain**: Score improves with repayments
- **Gradual deleveraging**: No sudden liquidations
- **x402 native**: HTTP 402 payments for agent services

---

## Contracts
See `docs/DEPLOYMENTS.md`

## Full Agent Integration
See `docs/AGENT_FLOW.md` for the complete code flow.
