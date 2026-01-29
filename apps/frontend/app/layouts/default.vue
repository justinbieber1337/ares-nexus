<template>
  <div class="min-h-screen bg-gradient-to-br from-[#05060d] via-[#0b0f1a] to-[#05060d]">
    <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.4em] text-neon">Ares-Nexus</p>
          <h1 class="text-2xl font-semibold text-white">Hybrid Matching Engine</h1>
        </div>
        <div class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
          Market Data Stream • 50ms buffer
        </div>
      </header>
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
