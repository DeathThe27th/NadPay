import { createConfig, http } from "wagmi";
import { monad, monadTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { MAINNET, TESTNET, activeChain } from "./network";

export const config = createConfig({
  chains: [activeChain],
  connectors: [injected()],
  transports: {
    [monad.id]: http(MAINNET.rpcUrl),
    [monadTestnet.id]: http(TESTNET.rpcUrl),
  },
  ssr: true,
});

export { activeChain };
