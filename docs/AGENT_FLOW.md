# Agent Flow (EVM) — Legasi on SKALE Base Sepolia

This is the **end‑to‑end agent flow**: register → LP yield → collateral → borrow → repay → withdraw.

## 0) Network
- Chain: **SKALE Base Sepolia**
- RPC: `https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha`
- Contracts: see `docs/DEPLOYMENTS.md`

## 1) Register agent (waitlist API)

**Coinbase Agentic Wallet**
- Auth for `valentin@legasi.io` is ready (via `npx awal`).
POST `/api/agent/register`

```json
{
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "agentName": "ArbitrageBot",
  "agentDescription": "Autonomous DeFi agent",
  "useCase": "Borrow USDC for execution",
  "referralCode": "ABC123"
}
```

## 2) Get test tokens (Faucet)
Open: **https://evm.legasi.io/faucet**
- Mint **USDC / WETH / WBTC**

**Token decimals**
- USDC: 6
- WETH: 6
- WBTC: 8

## 3) LP Yield (USDC)
### Steps
1. **Approve** USDC to LP contract
2. **Deposit** to LP
3. Receive **LP shares**
4. **Withdraw** later using LP shares

### Contract calls
- `LP.deposit(amount)`
- `LP.withdraw(shares)`

## 4) Collateral → Borrow → Repay → Withdraw
### Steps
1. **Initialize** position
2. **Approve** collateral (WETH/WBTC)
3. **Deposit** collateral
4. **Borrow** USDC
5. **Repay** USDC
6. **Withdraw** collateral

### Contract calls (LegasiLending)
- `initializePosition()`
- `deposit(token, amount)`
- `borrow(token, amount)`
- `repay(token, amount, amountUsd6)`
- `withdraw(token, amount)`

## 5) Minimal agent script (viem)
```ts
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { skaleBaseSepolia } from 'viem/chains';

const RPC = 'https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha';
const account = privateKeyToAccount('0xYOUR_PK');

const publicClient = createPublicClient({ chain: skaleBaseSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: skaleBaseSepolia, transport: http(RPC) });

// Addresses from docs/DEPLOYMENTS.md
const lending = '0x...';
const lp = '0x...';
const usdc = '0x...';
const weth = '0x...';
const wbtc = '0x...';

// ERC20 approve
await wallet.writeContract({
  address: weth,
  abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'approve',
  args: [lending, 1_000_000n], // 1 WETH (6 decimals)
});

// Deposit collateral
await wallet.writeContract({
  address: lending,
  abi: [{ name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'deposit',
  args: [weth, 1_000_000n],
});

// Borrow USDC
await wallet.writeContract({
  address: lending,
  abi: [{ name: 'borrow', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'borrow',
  args: [usdc, 100_000_000n], // 100 USDC (6 decimals)
});

// Repay USDC (amountUsd6 should equal USDC amount for demo)
await wallet.writeContract({
  address: usdc,
  abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'approve',
  args: [lending, 100_000_000n],
});
await wallet.writeContract({
  address: lending,
  abi: [{ name: 'repay', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'amountUsd6', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'repay',
  args: [usdc, 100_000_000n, 100_000_000n],
});

// Withdraw collateral
await wallet.writeContract({
  address: lending,
  abi: [{ name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'withdraw',
  args: [weth, 1_000_000n],
});

// LP deposit USDC
await wallet.writeContract({
  address: usdc,
  abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'approve',
  args: [lp, 500_000_000n],
});
await wallet.writeContract({
  address: lp,
  abi: [{ name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [
    { name: 'amount', type: 'uint256' },
  ], outputs: [] }],
  functionName: 'deposit',
  args: [500_000_000n],
});
```

## 6) UI alternative (no code)
- Go to **https://evm.legasi.io**
- Connect MetaMask
- Deposit WETH/WBTC as collateral
- Borrow/repay USDC
- LP deposit/withdraw via LP section

---

If you need a packaged SDK, use the **Colosseum SDK** as reference and port to EVM (see `skill/legasi-lending` in colosseum repo).