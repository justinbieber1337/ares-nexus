<template>
  <div class="rounded-xl bg-panel/70 p-6 shadow-glow">
    <div class="mb-4 flex items-center justify-between">
      <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Place Order</p>
      <span class="text-xs text-slate-500">{{ marketId }}</span>
    </div>
    <div class="grid gap-3">
      <input
        v-model.number="price"
        type="number"
        min="0"
        placeholder="Price"
        class="w-full rounded-md bg-transparent px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:ring-neon"
      />
      <input
        v-model.number="quantity"
        type="number"
        min="0"
        placeholder="Quantity"
        class="w-full rounded-md bg-transparent px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:ring-neon"
      />
      <div class="flex gap-3">
        <button
          class="flex-1 rounded-md bg-success px-4 py-2 text-xs font-semibold text-black"
          @click="submitOrder('bid')"
        >
          Buy
        </button>
        <button
          class="flex-1 rounded-md bg-danger px-4 py-2 text-xs font-semibold text-white"
          @click="submitOrder('ask')"
        >
          Sell
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner';
import { useMarketStore } from '~/stores/market';
import { useWallet } from '~/composables/useWallet';

const market = useMarketStore();
const { $socket } = useNuxtApp();
const { address } = useWallet();

const price = ref(0);
const quantity = ref(0);
const marketId = computed(() => market.marketId || 'BTC-USD');

const submitOrder = (side: 'bid' | 'ask') => {
  if (!$socket) {
    toast.error('Socket not connected');
    return;
  }
  if (!price.value || !quantity.value) {
    toast.error('Enter price and quantity');
    return;
  }
  const order = {
    orderId: crypto.randomUUID(),
    marketId: marketId.value,
    userId: address.value ?? 'user-demo',
    accountId: address.value ?? 'account-demo',
    side,
    type: 'limit',
    priceTicks: price.value,
    quantity: quantity.value,
    idempotencyKey: crypto.randomUUID(),
    requestHash: `${side}:${price.value}:${quantity.value}:${Date.now()}`,
  };

  $socket.emit('PLACE_ORDER', order);
  toast.success('Order sent');
};
</script>
