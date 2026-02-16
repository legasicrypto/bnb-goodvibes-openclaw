---
name: legasi-lending-evm
description: Autonomous USDC borrowing for AI agents on SKALE Base Sepolia. Deposit collateral, borrow USDC, earn LP yield, use flash loans.
homepage: https://evm.legasi.io
metadata: {"clawdbot":{"emoji":"⚡","requires":{"bins":["node","npm"]}}}
---

# Legasi Lending (EVM) Skill

Enable your agent to borrow USDC, earn yield, and execute flash loans on **SKALE Base Sepolia**.

## Contracts

```typescript
const CONTRACTS = {
  core: "0x84d9D82d528D0E1c8c9d149577cE22be7526ca91",
  lending: "0xB966e02Ca94bD54F6a3aB64eD05045616a712618",
  lp: "0x3a197F95EEED77CE9A6006FAaE89E5C86f3B90aB",
  gad: "0xfC3E84409989C316500378949C6aF45dc1070b2A",
  flash: "0x3BC223A9564dC6fe97168aA4B2330aa079860dc3",
  usdc: "0x8692A9d69113E1454C09c631AdE12949E5c11306",
  weth: "0x1eA5C029D6aea21f066D661CA7B6f5404Cd4d409",
};
const RPC = 'https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha';
```

## Quick Start

### 1) Install
```bash
npm install viem
```

### 2) Setup Client
```typescript
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0xYOUR_PK');
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
```

### 3) Credit Flow
```typescript
// Deposit collateral
await wallet.writeContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'deposit', type: 'function', inputs: [{name:'token',type:'address'},{name:'amount',type:'uint256'}] }],
  functionName: 'deposit',
  args: [CONTRACTS.weth, 1_000_000n], // 1 WETH (6 decimals)
});

// Borrow USDC
await wallet.writeContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'borrow', type: 'function', inputs: [{name:'token',type:'address'},{name:'amount',type:'uint256'}] }],
  functionName: 'borrow',
  args: [CONTRACTS.usdc, 500_000_000n], // 500 USDC
});

// Repay
await wallet.writeContract({
  address: CONTRACTS.usdc,
  abi: [{ name: 'approve', type: 'function', inputs: [{name:'spender',type:'address'},{name:'amount',type:'uint256'}] }],
  functionName: 'approve',
  args: [CONTRACTS.lending, 500_000_000n],
});
await wallet.writeContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'repay', type: 'function', inputs: [{name:'token',type:'address'},{name:'amount',type:'uint256'},{name:'amountUsd6',type:'uint256'}] }],
  functionName: 'repay',
  args: [CONTRACTS.usdc, 500_000_000n, 500_000_000n],
});

// Withdraw
await wallet.writeContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'withdraw', type: 'function', inputs: [{name:'token',type:'address'},{name:'amount',type:'uint256'}] }],
  functionName: 'withdraw',
  args: [CONTRACTS.weth, 1_000_000n],
});
```

### 4) Flash Loans
```typescript
// 0.09% fee, must repay in same tx
const fee = await publicClient.readContract({
  address: CONTRACTS.flash,
  abi: [{ name: 'calculateFee', type: 'function', inputs: [{name:'amount',type:'uint256'}], outputs: [{type:'uint256'}] }],
  functionName: 'calculateFee',
  args: [10_000_000_000n], // 10,000 USDC
});
// fee = 9,000,000 (9 USDC)
```

### 5) LP Yield
```typescript
// Deposit USDC to earn yield
await wallet.writeContract({
  address: CONTRACTS.lp,
  abi: [{ name: 'deposit', type: 'function', inputs: [{name:'amount',type:'uint256'}] }],
  functionName: 'deposit',
  args: [1_000_000_000n], // 1000 USDC
});
```

## Agent Configuration

Configure autonomous borrowing limits:
```typescript
await wallet.writeContract({
  address: CONTRACTS.lending,
  abi: [{ name: 'configureAgent', type: 'function', inputs: [
    {name:'dailyLimitUsd6',type:'uint256'},
    {name:'autoRepay',type:'bool'},
    {name:'x402',type:'bool'}
  ]}],
  functionName: 'configureAgent',
  args: [5_000_000_000n, true, true], // $5,000/day, auto-repay, x402 enabled
});
```

## Coinbase Agentic Wallet

If using Coinbase Agentic Wallet:
```bash
npx awal@latest status  # Check auth
npx awal@latest show    # Open UI
```

## Full Documentation

See `docs/AGENT_FLOW.md` for complete examples.
