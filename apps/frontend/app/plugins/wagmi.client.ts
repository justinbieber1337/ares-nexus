import { createConfig } from '@wagmi/core';
import { injected, walletConnect } from '@wagmi/connectors';
import { http } from 'viem';
import { mainnet } from 'viem/chains';
import { createWeb3Modal } from '@web3modal/wagmi/vue';

export default defineNuxtPlugin(() => {
  if (!process.client) return;

  const runtimeConfig = useRuntimeConfig();
  const projectId = runtimeConfig.public.walletConnectProjectId;
  const connectors = projectId
    ? [
        injected(),
        walletConnect({
          projectId,
          metadata: {
            name: 'Ares-Nexus',
            description: 'Ares-Nexus Trading Hub',
            url: 'http://localhost:3000',
            icons: ['https://walletconnect.com/walletconnect-logo.png'],
          },
        }),
      ]
    : [injected()];

  const wagmiConfig = createConfig({
    chains: [mainnet],
    connectors,
    transports: {
      [mainnet.id]: http(),
    },
  });

  if (projectId) {
    createWeb3Modal({
      wagmiConfig,
      projectId,
      enableAnalytics: false,
    });
  }

  return {
    provide: {
      wagmi: wagmiConfig,
    },
  };
});
