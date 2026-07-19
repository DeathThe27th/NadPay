import { monad, monadTestnet } from "wagmi/chains";
import type { SwapConfig } from "./swap";

/**
 * Single source of truth for everything network-specific (BUILD-4-MAINNET.md).
 * Testnet and mainnet live side by side; NEXT_PUBLIC_NETWORK=testnet flips the
 * whole app back to testnet for safe demos, mainnet is the default.
 */
export type NetworkConfig = {
  chain: typeof monad | typeof monadTestnet;
  rpcUrl: string;
  explorerUrl: string;
  nadpayAddress: `0x${string}`;
  swap: SwapConfig | null;
};

export const TESTNET: NetworkConfig = {
  chain: monadTestnet,
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadscan.com",
  nadpayAddress: "0x42517273BE74153DF1aF39778f3EfdCf5C80f159",
  // No Uniswap deployment on the post-reset testnet (see lib/swap.ts history).
  swap: null,
};

/**
 * Mainnet address provenance (chain 143, resolved 2026-07-19):
 * - WMON / USDC from monskills addresses skill; verified on-chain
 *   (code present, symbol() == "WMON" / "USDC", USDC decimals() == 6).
 * - SwapRouter02 / QuoterV2 from monad-crypto/protocols mainnet/uniswap.jsonc;
 *   verified on-chain (code present).
 * - Pool fee 3000: the WMON/USDC 0.3% pool quotes a flat per-MON rate from
 *   0.01 up to 50 MON (deepest tier; the 0.05% tier degrades ~17% at 50 MON).
 */
export const MAINNET: NetworkConfig = {
  chain: monad,
  rpcUrl: "https://rpc.monad.xyz",
  explorerUrl: "https://monadscan.com",
  // Deployed 2026-07-19 (tx 0xb2ab6573…1824), verified on Monadscan +
  // MonadVision. Same address as testnet: same deployer wallet, same nonce.
  nadpayAddress: "0x42517273BE74153DF1aF39778f3EfdCf5C80f159",
  swap: {
    router: "0xfE31F71C1b106EAc32F1A19239c9a9A72ddfb900",
    quoter: "0x661E93cca42AfacB172121EF892830cA3b70F08d",
    poolFee: 3000,
    wmon: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  },
};

export const ACTIVE_NETWORK: NetworkConfig =
  process.env.NEXT_PUBLIC_NETWORK === "testnet" ? TESTNET : MAINNET;

export const activeChain = ACTIVE_NETWORK.chain;
