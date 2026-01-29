import { connect, disconnect, getAccount, watchAccount } from '@wagmi/core';
import { injected } from '@wagmi/connectors';

export const useWallet = () => {
  const { $wagmi } = useNuxtApp();
  const address = ref<string | null>(null);
  const isConnected = ref(false);

  if (process.client && $wagmi) {
    const account = getAccount($wagmi);
    address.value = account.address ?? null;
    isConnected.value = account.isConnected;

    watchAccount($wagmi, {
      onChange(next) {
        address.value = next.address ?? null;
        isConnected.value = next.isConnected;
      },
    });
  }

  const connectWallet = async () => {
    if (!$wagmi) return;
    await connect($wagmi, { connector: injected() });
    const account = getAccount($wagmi);
    address.value = account.address ?? null;
    isConnected.value = account.isConnected;
  };

  const disconnectWallet = async () => {
    if (!$wagmi) return;
    await disconnect($wagmi);
    const account = getAccount($wagmi);
    address.value = account.address ?? null;
    isConnected.value = account.isConnected;
  };

  return {
    address,
    isConnected,
    connectWallet,
    disconnectWallet,
  };
};
