# Deployments — SKALE Base Sepolia

**Network:** SKALE Base Sepolia  
**Chain ID:** 1444673419  
**RPC:** `https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha`

## Core Protocol

| Contract | Address | Description |
|----------|---------|-------------|
| **LegasiCore** | `0x84d9D82d528D0E1c8c9d149577cE22be7526ca91` | Config, prices, LTV settings |
| **LegasiLending** | `0xB966e02Ca94bD54F6a3aB64eD05045616a712618` | Deposit, borrow, repay, withdraw |
| **LegasiLP** | `0x3a197F95EEED77CE9A6006FAaE89E5C86f3B90aB` | LP vault for yield |
| **LegasiGAD** | `0xfC3E84409989C316500378949C6aF45dc1070b2A` | Gradual Auto-Deleveraging |
| **LegasiFlash** | `0x3BC223A9564dC6fe97168aA4B2330aa079860dc3` | Flash loans (0.09% fee) |
| **ReputationRegistry** | `0xABad189F8127D24EcB98d6583e51Cc458c996Bf3` | On-chain credit scoring |
| **X402Receipt** | `0x6810E9B16512959Fe9BAB74a8532e38450D0dA58` | HTTP 402 payment receipts |

## Mock Tokens (Testnet)

| Token | Address | Decimals |
|-------|---------|----------|
| **USDC.e** | `0x8692A9d69113E1454C09c631AdE12949E5c11306` | 6 |
| **WETH** | `0x1eA5C029D6aea21f066D661CA7B6f5404Cd4d409` | 6 |
| **WBTC** | `0x7787dC83291C37d349D9523D028771914679f4C5` | 8 |

## Pool Liquidity

- Lending pool: **1,000,000 USDC**
- Flash pool: **100,000 USDC**

## Collateral Config

| Token | Max LTV | Liquidation Threshold | Liquidation Bonus |
|-------|---------|----------------------|-------------------|
| WETH | 75% | 80% | 5% |
| WBTC | 70% | 75% | 5% |

## Price Feeds (Manual)

Prices updated via `LegasiCore.updatePrice()`:
- WETH: $2,600
- WBTC: $45,000
- USDC: $1

---

*Last updated: 2026-02-13*
