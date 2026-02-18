# Agent E2E Demo — Borrow → Spend (x402) → Repay

This script demonstrates the full agent loop on **BNB Smart Chain Testnet (chainId 97)**:

1) Mint mock collateral + mUSDC (for repay)
2) Deposit collateral → Borrow mUSDC (working capital)
3) Enable `x402Enabled` on-chain (Agent Configuration)
4) Call a premium API → receive **HTTP 402** challenge
5) Pay via **on-chain receipt** (X402USDCReceipt v2, paid in mUSDC)
6) Retry request → receive premium response
7) Repay → reputation increases

## Prereqs

- Node 18+ (repo uses Node 22)
- A wallet private key with **some tBNB** for gas

## Run

```bash
cd bnb-goodvibes-openclaw

# Required
export AGENT_PK=0xYOUR_PRIVATE_KEY

# Optional overrides
export BSC_TESTNET_RPC=https://bsc-testnet-rpc.publicnode.com
export PREMIUM_BASE_URL=https://bnb.legasi.io

npm run agent:e2e
```

## What to show judges

- Console prints:
  - the 402 challenge
  - on-chain tx hashes (approve + pay)
  - premium response payload
  - reputation before/after repay

This is the cleanest proof that **agents can run on credit** and **buy API services via x402** on BNB chain.

## Coinbase Agentic Wallet (optional)
We also ship OpenClaw `.agents/skills/` for Coinbase Agentic Wallet (`npx awal@latest`) authentication & operations.
The public web demo uses MetaMask for judge-friendly verification, but the agent wallet path is available for agent integrations.
