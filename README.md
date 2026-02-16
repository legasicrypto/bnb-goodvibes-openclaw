# Legasi — Agentic Commerce

**x402 Payment Protocol + Credit Infrastructure for AI Agents on SKALE.**

> 🛒 **Agentic Commerce**: AI agents buying, selling, and paying for services — autonomously.

🌐 **Live Demo:** https://evm.legasi.io

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
Agent → Service (HTTP 402) → Agent pays via x402Receipt → Service delivers
```

### Why SKALE?

- **Zero gas** — Perfect for high-frequency x402 payments
- **Fast finality** — Sub-second confirmations
- **EVM compatible** — Standard tooling (wagmi, viem, ethers)

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
| Core | `0x84d9D82d528D0E1c8c9d149577cE22be7526ca91` |
| Lending | `0xB966e02Ca94bD54F6a3aB64eD05045616a712618` |
| LP | `0x3a197F95EEED77CE9A6006FAaE89E5C86f3B90aB` |
| GAD | `0xfC3E84409989C316500378949C6aF45dc1070b2A` |
| Flash | `0x3BC223A9564dC6fe97168aA4B2330aa079860dc3` |
| Reputation | `0xABad189F8127D24EcB98d6583e51Cc458c996Bf3` |

See `docs/DEPLOYMENTS.md` for full details.

---

## Quick Start

### 1. Run the Demo (60 seconds)

1. Open https://evm.legasi.io
2. Connect MetaMask on **SKALE Base Sepolia**
3. Get test tokens via **Faucet**
4. Supply collateral → Borrow → Repay → Withdraw

### 2. Local Development

```bash
# Clone
git clone https://github.com/legasicrypto/skale-hackathon
cd skale-hackathon

# Install
npm install
cd app && npm install && cd ..

# Configure
cp .env.example .env
# Add SKALE_RPC + DEPLOYER_PK

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat run scripts/deploy-all.ts --network skale
```

### 3. Frontend

```bash
cd app
npm run dev
# Open http://localhost:3000
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
  chain: skaleBaseSepolia,
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
skale-hackathon/
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

- 🌐 **Live Demo:** https://evm.legasi.io
- 🐦 **Twitter:** [@legasi_xyz](https://x.com/legasi_xyz)
- 📖 **GitHub:** [legasicrypto/skale-hackathon](https://github.com/legasicrypto/skale-hackathon)

---

*Built for the SKALE Hackathon 2026*
