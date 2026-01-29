<template>
  <div ref="panel" class="rounded-xl bg-panel/70 p-6 shadow-glow">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-neon">Web3 Vault</p>
        <h3 class="text-lg font-semibold">Connect Wallet</h3>
      </div>
      <div class="flex items-center gap-2">
        <ClientOnly v-if="hasWeb3Modal">
          <w3m-button balance="hide" />
        </ClientOnly>
        <button
          v-else
          class="rounded-full border border-neon/40 px-4 py-2 text-sm text-neon transition disabled:opacity-50"
          :disabled="loading"
          @click="toggleConnection"
          @mouseenter="pulseButton"
        >
          {{ isConnected ? 'Disconnect' : 'Connect' }}
        </button>
      </div>
    </div>

    <div class="mt-4 text-sm text-slate-300">
      <p v-if="isConnected">
        Connected: <span class="text-neon">{{ shortAddress }}</span>
      </p>
      <p v-else class="text-slate-400">No wallet connected</p>
    </div>

    <div class="mt-6 grid gap-4">
      <div class="rounded-lg border border-white/10 bg-slate-900/50 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Deposit</p>
        <div class="mt-3 flex items-center gap-3">
          <input
            v-model="depositAmount"
            type="number"
            min="0"
            placeholder="Amount"
            class="w-full rounded-md bg-transparent px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:ring-neon"
          />
          <button
            class="rounded-md bg-neon px-4 py-2 text-xs font-semibold text-black disabled:opacity-60"
            :disabled="loading"
            @click="submitLedger('deposit', depositAmount)"
          >
            Submit
          </button>
        </div>
      </div>

      <div class="rounded-lg border border-white/10 bg-slate-900/50 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Withdraw</p>
        <div class="mt-3 flex items-center gap-3">
          <input
            v-model="withdrawAmount"
            type="number"
            min="0"
            placeholder="Amount"
            class="w-full rounded-md bg-transparent px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:ring-accent"
          />
          <button
            class="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            :disabled="loading"
            @click="submitLedger('withdraw', withdrawAmount)"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { toast } from 'vue-sonner';
import { useWallet } from '~/composables/useWallet';

const panel = ref<HTMLDivElement | null>(null);
const { isConnected, address, connectWallet, disconnectWallet } = useWallet();
const depositAmount = ref('');
const withdrawAmount = ref('');
const loading = ref(false);
const runtimeConfig = useRuntimeConfig();
const hasWeb3Modal = computed(() => !!runtimeConfig.public.walletConnectProjectId);

const submitLedger = async (direction: 'deposit' | 'withdraw', amount: string) => {
  if (!amount || Number(amount) <= 0) {
    toast.error('Enter a valid amount');
    return;
  }
  try {
    loading.value = true;
    await $fetch(`${runtimeConfig.public.apiUrl}/wallet/ledger`, {
      method: 'POST',
      body: {
        accountId: address.value ?? 'account-demo',
        asset: 'USD',
        amount: Number(amount),
        direction,
        idempotencyKey: crypto.randomUUID(),
        requestHash: `${direction}:${amount}:${Date.now()}`,
      },
    });
    toast.success(`${direction === 'deposit' ? 'Deposit' : 'Withdraw'} successful`);
  } catch (error: any) {
    toast.error(error?.data?.message ?? 'Operation failed');
  } finally {
    loading.value = false;
  }
};

const shortAddress = computed(() => {
  if (!address.value) return '';
  return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`;
});

const toggleConnection = () => {
  if (isConnected.value) {
    disconnectWallet();
  } else {
    connectWallet();
  }
};

const pulseButton = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;
  gsap.fromTo(target, { scale: 1 }, { scale: 1.05, duration: 0.2, yoyo: true, repeat: 1 });
};

onMounted(() => {
  if (panel.value) {
    gsap.from(panel.value, {
      opacity: 0,
      y: 16,
      duration: 0.6,
      ease: 'power3.out',
    });
  }
});
</script>
