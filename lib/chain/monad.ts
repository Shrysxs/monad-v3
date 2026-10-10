import { defineChain } from "viem";

/**
 * Canonical Monad Testnet Chain Definition
 * Matches MONSKILLS parameters (Chain ID 10143)
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      ],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL || "https://testnet.monadscan.com",
    },
  },
  testnet: true,
});
