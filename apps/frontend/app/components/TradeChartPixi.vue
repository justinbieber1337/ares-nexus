<template>
  <div ref="container" class="h-full w-full rounded-xl bg-panel/70 shadow-glow"></div>
</template>

<script setup lang="ts">
import * as PIXI from 'pixi.js';
import { useMarketStore } from '~/stores/market';

const container = ref<HTMLDivElement | null>(null);
const market = useMarketStore();

let app: PIXI.Application | null = null;
let graphics: PIXI.Graphics | null = null;
let resizeObserver: ResizeObserver | null = null;

const renderChart = () => {
  if (!app || !graphics) return;
  const trades = market.trades.slice(0, 80).reverse();
  graphics.clear();

  const width = app.renderer.width;
  const height = app.renderer.height;
  graphics.lineStyle(2, 0x00f5ff, 0.9);

  if (!trades.length) return;

  const prices = trades.map((trade) => trade.priceTicks);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  trades.forEach((trade, index) => {
    const x = (index / (trades.length - 1)) * (width - 32) + 16;
    const y = height - ((trade.priceTicks - min) / range) * (height - 32) - 16;
    if (index === 0) {
      graphics.moveTo(x, y);
    } else {
      graphics.lineTo(x, y);
    }
  });
};

const initPixi = async () => {
  if (!container.value) return;
  app = new PIXI.Application();
  await app.init({
    width: container.value.clientWidth,
    height: container.value.clientHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  container.value.appendChild(app.canvas);

  graphics = new PIXI.Graphics();
  app.stage.addChild(graphics);

  renderChart();
  resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(container.value);
};

const resize = () => {
  if (!app || !container.value) return;
  app.renderer.resize(container.value.clientWidth, container.value.clientHeight);
  renderChart();
};

watch(() => market.trades, renderChart, { deep: true });

onMounted(() => {
  if (process.client) {
    initPixi();
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  app?.destroy(true);
  app = null;
});
</script>
