<template>
  <div ref="container" class="h-full w-full rounded-xl bg-panel/70 shadow-glow"></div>
</template>

<script setup lang="ts">
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { useMarketStore, type OrderLevel } from '~/stores/market';

const container = ref<HTMLDivElement | null>(null);
const market = useMarketStore();

const maxRows = 24;
const columns = [
  { label: 'Price', x: 16 },
  { label: 'Amount', x: 160 },
  { label: 'Total', x: 300 },
];

type RowItem = {
  container: PIXI.Container;
  background: PIXI.Graphics;
  priceText: PIXI.Text;
  amountText: PIXI.Text;
  totalText: PIXI.Text;
  lastValues: { price: string; amount: string; total: string; side: string };
};

let app: PIXI.Application | null = null;
const rows: RowItem[] = [];
let resizeObserver: ResizeObserver | null = null;

const visibleLevels = computed<OrderLevel[]>(() => {
  const half = Math.floor(maxRows / 2);
  const asks = market.asks.slice(0, half).reverse();
  const bids = market.bids.slice(0, half);
  return [...asks, ...bids];
});

const formatNumber = (value: number) => value.toFixed(2);

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
  createHeaders();
  createRows();
  renderRows();

  resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(container.value);
};

const createHeaders = () => {
  if (!app) return;
  columns.forEach((column) => {
    const header = new PIXI.Text({
      text: column.label,
      style: {
        fill: '#7c9fff',
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
      },
    });
    header.x = column.x;
    header.y = 8;
    app.stage.addChild(header);
  });
};

const createRows = () => {
  if (!app) return;
  const rowHeight = 22;
  for (let i = 0; i < maxRows; i += 1) {
    const rowContainer = new PIXI.Container();
    rowContainer.y = 28 + i * rowHeight;

    const background = new PIXI.Graphics();
    background.beginFill(0x0b1220, 0.35);
    background.drawRoundedRect(8, 2, 360, rowHeight - 4, 6);
    background.endFill();
    rowContainer.addChild(background);

    const priceText = new PIXI.Text({
      text: '--',
      style: { fill: '#12d6a7', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
    });
    priceText.x = columns[0].x;
    priceText.y = 4;

    const amountText = new PIXI.Text({
      text: '--',
      style: { fill: '#e6f0ff', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
    });
    amountText.x = columns[1].x;
    amountText.y = 4;

    const totalText = new PIXI.Text({
      text: '--',
      style: { fill: '#e6f0ff', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
    });
    totalText.x = columns[2].x;
    totalText.y = 4;

    rowContainer.addChild(priceText, amountText, totalText);
    app.stage.addChild(rowContainer);

    rows.push({
      container: rowContainer,
      background,
      priceText,
      amountText,
      totalText,
      lastValues: { price: '', amount: '', total: '', side: '' },
    });
  }
};

const renderRows = () => {
  if (!app) return;
  const levels = visibleLevels.value;
  const lastTradePrice = market.lastTradePrice;
  rows.forEach((row, index) => {
    const level = levels[index];
    if (!level) {
      row.container.visible = false;
      return;
    }
    row.container.visible = true;

    const price = formatNumber(level.price);
    const amount = formatNumber(level.amount);
    const total = formatNumber(level.total || level.price * level.amount);
    const side = level.side;

    if (row.lastValues.price !== price) row.priceText.text = price;
    if (row.lastValues.amount !== amount) row.amountText.text = amount;
    if (row.lastValues.total !== total) row.totalText.text = total;

    const priceColor = side === 'bid' ? 0x12d6a7 : 0xff4d6d;
    row.priceText.style.fill = priceColor;

    row.lastValues = { price, amount, total, side };

    if (lastTradePrice && Math.abs(level.price - lastTradePrice) < 0.0001) {
      gsap.fromTo(
        row.background,
        { alpha: 0.9 },
        { alpha: 0.35, duration: 0.6, ease: 'power2.out' },
      );
    }
  });
};

const resize = () => {
  if (!app || !container.value) return;
  app.renderer.resize(container.value.clientWidth, container.value.clientHeight);
};

watch(visibleLevels, renderRows, { deep: true });
watch(() => market.lastTradePrice, renderRows);

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
