'use client';

import { FC, ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Chain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface Props {
  children: ReactNode;
}

const bscTestnet: Chain = {
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 97),
  name: 'BSC Testnet',
  nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'] },
    public: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'BscScan (testnet)', url: process.env.NEXT_PUBLIC_EXPLORER || 'https://testnet.bscscan.com' },
  },
};

const config = createConfig({
  chains: [bscTestnet],
  connectors: [injected()],
  transports: {
    [bscTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export const WalletProvider: FC<Props> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>{children}</WagmiProvider>
    </QueryClientProvider>
  );
};
