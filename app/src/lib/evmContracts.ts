const required = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

export const CONTRACTS = {
  // Core protocol
  core: required("NEXT_PUBLIC_CORE"),
  lending: required("NEXT_PUBLIC_LENDING"),
  lp: required("NEXT_PUBLIC_LP"),
  gad: required("NEXT_PUBLIC_GAD"),
  reputation: required("NEXT_PUBLIC_REPUTATION"),
  x402: required("NEXT_PUBLIC_X402"),

  // Mock tokens (testnet)
  usdc: required("NEXT_PUBLIC_USDC"),
  wbtc: required("NEXT_PUBLIC_WBTC"),
  weth: required("NEXT_PUBLIC_WETH"),
};

// Network config
export const NETWORK_CONFIG = {
  chainId: Number(required("NEXT_PUBLIC_CHAIN_ID")),
  name: "BSC Testnet",
  rpc: required("NEXT_PUBLIC_RPC_URL"),
  explorer: required("NEXT_PUBLIC_EXPLORER"),
};
