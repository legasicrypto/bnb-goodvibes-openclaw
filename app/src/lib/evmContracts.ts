// NOTE: In Next.js, only statically-referenced env vars are inlined in the client bundle.
// Do NOT access process.env with a dynamic key (e.g. process.env[key]) inside client code.

export const CONTRACTS = {
  // Core protocol (BSC testnet)
  core: process.env.NEXT_PUBLIC_CORE || "0x7C3dd137c13653aaa8457A220aa4B586a30AD7F6",
  lending: process.env.NEXT_PUBLIC_LENDING || "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7",
  lp: process.env.NEXT_PUBLIC_LP || "0xDd5605472769C91C3592023A445f1B4aB0cAED7a",
  gad: process.env.NEXT_PUBLIC_GAD || "0x0eD2B07885Bb42D36d910857b02A5c797BcF8724",
  reputation: process.env.NEXT_PUBLIC_REPUTATION || "0x02c0B1A438eCccD978D11889f19cd20A5584fBFf",
  x402: process.env.NEXT_PUBLIC_X402 || "0x988aA233bc27d60110c6026897d7e41F4C6D3C7c",

  // Mock tokens (testnet demo)
  usdc: process.env.NEXT_PUBLIC_USDC || "0x31C007fD6597748dacde1e243A8ef1C083bbC8F4",
  wbtc: process.env.NEXT_PUBLIC_WBTC || "0xFCD7E225F9aeF687e3d2E3b90f62e7dCDf2Af9C3",
  weth: process.env.NEXT_PUBLIC_WETH || "0x040Cc7C35B5ea611519e3AB6389632dc690ee701",
};

export const NETWORK_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 97),
  name: "BSC Testnet",
  rpc: process.env.NEXT_PUBLIC_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
  explorer: process.env.NEXT_PUBLIC_EXPLORER || "https://testnet.bscscan.com",
};
