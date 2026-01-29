<template>
  <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
    <section class="grid gap-6">
      <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ClientOnly>
          <OrderBookPixi class="h-[520px]" />
        </ClientOnly>
        <div class="grid gap-6">
          <ClientOnly>
            <TradeChartPixi class="h-[250px]" />
          </ClientOnly>
          <RecentTrades />
        </div>
      </div>
    </section>
    <aside class="grid gap-6">
      <WalletPanel />
      <OrderForm />
      <div class="rounded-xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">System Status</p>
        <div class="mt-4 space-y-2">
          <p>Latency Buffer: <span class="text-neon">50ms</span></p>
          <p>Orderbook Sync: <span class="text-success">Stable 60 FPS</span></p>
          <p>Protocol: <span class="text-slate-100">WebSocket + PixiJS</span></p>
        </div>
      </div>
    </aside>
  </div>
</template>
