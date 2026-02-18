# Legasi — Agentic Commerce

**x402 Payment Protocol + Credit Infrastructure for AI Agents on BNB Chain.**

> 🛒 **Agentic Commerce**: AI agents buying, selling, and paying for services — autonomously.

🌐 **Live Demo:** https://bnb.legasi.io

---

## What is Legasi?

Legasi implements **x402 (HTTP 402 Payment Required)** for the agentic economy:

- **x402 Payments** — On-chain receipts for machine-to-machine payments
- **Credit Lines** — Agents borrow USDC to fund x402 payments
- **On-chain Reputation** — Payment history improves credit terms
- **Flash Loans** — Zero-collateral loans for arbitrage (0.09% fee)
- **Gradual Deleveraging** — No sudden liquidations

### The x402 Flow

```
Agent → Service (HTTP 402) → Agent pays via X402USDCReceipt.pay() → Service verifies receipt → Content delivered
```

### Why BNB Chain?

- **Low fees** — viable for high-frequency agent actions (borrow/pay/retry loops)
- **Fast finality** — smooth UX for HTTP 402 payment handshakes
- **EVM compatible** — standard tooling (wagmi, viem, ethers)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Legasi Protocol                        │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│ LegasiCore  │ Reputation  │ LegasiGAD   │ X402Receipt      │
│ (Config)    │ (Scoring)   │ (Deleverage)│ (HTTP 402)       │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│                     LegasiLending                           │
│            deposit → borrow → repay → withdraw              │
├────────────────────────────┬───────────────────────────────┤
│        LegasiLP            │        LegasiFlash            │
│    (Yield Vault)           │     (Flash Loans)             │
└────────────────────────────┴───────────────────────────────┘
```

---

## Deployed Contracts

| Contract | Address |
|----------|---------|
| Core | `0x7C3dd137c13653aaa8457A220aa4B586a30AD7F6` |
| Lending | `0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7` |
| LP | `0xDd5605472769C91C3592023A445f1B4aB0cAED7a` |
| GAD | `0x0eD2B07885Bb42D36d910857b02A5c797BcF8724` |
| Reputation | `0x02c0B1A438eCccD978D11889f19cd20A5584fBFf` |
| X402Receipt (v1, legacy) | `0x988aA233bc27d60110c6026897d7e41F4C6D3C7c` |
| X402USDCReceipt (v2, paywall) | `0x570BF4EdE1029c7Bc610f507c7D7a252F7328F24` |

See `docs/DEPLOYMENTS.md` for full details.

---

## Quick Start

### 1) Run the Demo (2–3 minutes)

1. Open https://bnb.legasi.io
2. Connect MetaMask on **BNB Smart Chain Testnet** (chainId **97**)
3. Mint tokens via **Faucet**
4. Follow the guided runbook: https://bnb.legasi.io/demo

### 2) Reproduce locally (contracts)

```bash
git clone https://github.com/legasicrypto/bnb-goodvibes-openclaw
cd bnb-goodvibes-openclaw

npm install

# Optional (if you want to redeploy):
cp .env.example .env
# Set DEPLOYER_PK + BSC_TESTNET_RPC

npx hardhat compile
npx hardhat test

# Optional deploy (BSC testnet)
npm run deploy

# Verify deployed wiring on BSC testnet
npm run smoke:bsc
```

### 3) Frontend (local)

```bash
cd app
npm install
npm run dev
# http://localhost:3000
```

---

## Key Features

### 🤖 Agent-Native Credit

```typescript
// Configure agent limits
await lending.configureAgent(
  5000_000000n,  // $5,000/day limit
  true,          // Auto-repay enabled
  true           // x402 enabled
);

// Agent borrows autonomously within limits
await lending.borrow(usdc, 1000_000000n);
```

### 📊 On-Chain Reputation

```solidity
// Score increases with repayments
function updateOnRepay(address agent, uint256 repaidUsd6) external {
    Reputation storage r = reputations[agent];
    r.successfulRepayments += 1;
    r.totalRepaidUsd6 += repaidUsd6;
    r.score = _calcScore(...);
}
```

### 🛡️ Gradual Auto-Deleveraging (GAD)

No sudden liquidations. Positions unwind gradually:

```
LTV Overshoot → GAD Rate (quadratic curve)
5% over     → 0.25%/day liquidation
10% over    → 1%/day liquidation  
20% over    → 4%/day liquidation
```

### ⚡ Flash Loans

```typescript
// 0.09% fee, same-tx repayment
const fee = await flash.calculateFee(amount);
await flash.flashLoan(usdc, amount, receiver, data);
```

---

## Agent Integration

### Coinbase Agentic Wallet

We support **Coinbase Agentic Wallet** for agent authentication:

```bash
npx awal@latest status  # Check wallet
npx awal@latest show    # Open UI
```

See `.agents/skills/` for full skill definitions.

### Minimal Agent Script

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const wallet = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: bscTestnet,
  transport: http(RPC),
});

// Deposit collateral
await wallet.writeContract({
  address: lending,
  abi: lendingAbi,
  functionName: 'deposit',
  args: [weth, 1_000_000n], // 1 WETH
});

// Borrow USDC
await wallet.writeContract({
  address: lending,
  abi: lendingAbi,
  functionName: 'borrow',
  args: [usdc, 500_000_000n], // 500 USDC
});
```

See `docs/AGENT_FLOW.md` for complete examples.

---

## Documentation

| Doc | Description |
|-----|-------------|
| `docs/DEPLOYMENTS.md` | Contract addresses |
| `docs/DEMO_FLOW.md` | 5-minute demo script |
| `docs/AGENT_FLOW.md` | Full agent integration |
| `docs/REPUTATION_ERC8004.md` | Reputation system |
| `docs/X402_FLOW.md` | HTTP 402 payments |

---

## Repo Structure

```
BNB Chain-hackathon/
├── contracts/           # Solidity smart contracts
│   ├── LegasiCore.sol
│   ├── LegasiLending.sol
│   ├── LegasiLP.sol
│   ├── LegasiGAD.sol
│   ├── LegasiFlash.sol
│   ├── ReputationRegistry.sol
│   └── X402Receipt.sol
├── scripts/             # Deployment scripts
├── test/                # Contract tests
├── app/                 # Next.js frontend
│   └── src/
│       ├── app/         # Pages (dashboard, faucet)
│       └── lib/         # Contract addresses
├── docs/                # Documentation
├── .agents/             # Coinbase Agentic Wallet skills
└── skills/              # Legasi lending skill
```

---

## Links

- 🌐 **Live Demo:** https://bnb.legasi.io
- 🐦 **Twitter:** [@legasi_xyz](https://x.com/legasi_xyz)
- 📖 **GitHub:** [legasicrypto/bnb-goodvibes-openclaw](https://github.com/legasicrypto/bnb-goodvibes-openclaw)

---

*Built for the BNB Chain Hackathon 2026*
