<template>
  <div class="rounded-xl bg-panel/70 p-4 shadow-glow">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Recent Trades</p>
      <span class="text-xs text-slate-500">Last {{ trades.length }}</span>
    </div>
    <div class="space-y-2 text-xs">
      <div
        v-for="trade in trades"
        :key="trade.id ?? trade.executedAt ?? `${trade.priceTicks}-${trade.quantity}`"
        class="flex items-center justify-between rounded-md bg-slate-900/40 px-3 py-2"
      >
        <span :class="trade.side === 'bid' ? 'text-success' : 'text-danger'">
          {{ trade.priceTicks.toFixed(2) }}
        </span>
        <span class="text-slate-300">{{ trade.quantity.toFixed(2) }}</span>
        <span class="text-slate-500">{{ formatTime(trade.executedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarketStore } from '~/stores/market';

const market = useMarketStore();
const trades = computed(() => market.trades.slice(0, 12));

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>
