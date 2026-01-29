import { defineStore } from 'pinia';

export interface OrderLevel {
  price: number;
  amount: number;
  total: number;
  side: 'bid' | 'ask';
}

export interface MarketDepthPayload {
  marketId: string;
  bids?: OrderLevel[];
  asks?: OrderLevel[];
  bestBidPriceTicks?: number | null;
  bestAskPriceTicks?: number | null;
}

export interface TradePayload {
  id?: string;
  priceTicks: number;
  quantity: number;
  side: 'bid' | 'ask';
  executedAt?: string;
}

export interface MarketDataUpdate {
  marketId: string;
  orderBook?: {
    bestBidPriceTicks: number | null;
    bestAskPriceTicks: number | null;
    updatedAt?: string;
  };
  trades?: TradePayload[];
}

interface BufferState {
  depth?: MarketDepthPayload;
  trades: TradePayload[];
}

export const useMarketStore = defineStore('market', {
  state: () => ({
    marketId: '',
    bids: [] as OrderLevel[],
    asks: [] as OrderLevel[],
    trades: [] as TradePayload[],
    buffer: { trades: [] } as BufferState,
    bufferTimer: 0 as number | undefined,
    lastTradePrice: null as number | null,
  }),
  actions: {
    setMarket(marketId: string) {
      this.marketId = marketId;
    },
    enqueueDepth(update: MarketDepthPayload) {
      this.buffer.depth = update;
      this.ensureBufferTimer();
    },
    enqueueTrades(trades: TradePayload[]) {
      if (!trades.length) return;
      this.buffer.trades.push(...trades);
      this.ensureBufferTimer();
    },
    applyMarketDataUpdate(update: MarketDataUpdate) {
      if (update.orderBook) {
        this.enqueueDepth({
          marketId: update.marketId,
          bestBidPriceTicks: update.orderBook.bestBidPriceTicks,
          bestAskPriceTicks: update.orderBook.bestAskPriceTicks,
        });
      }
      if (update.trades?.length) {
        this.enqueueTrades(update.trades);
      }
    },
    ensureBufferTimer() {
      if (this.bufferTimer || !process.client) return;
      this.bufferTimer = window.setInterval(() => {
        this.flushBuffer();
      }, 50);
    },
    flushBuffer() {
      if (!this.buffer.depth && this.buffer.trades.length === 0) return;

      if (this.buffer.depth) {
        const depth = this.buffer.depth;
        if (depth.bids?.length) this.bids = depth.bids;
        if (depth.asks?.length) this.asks = depth.asks;
        if (
          (!depth.bids || !depth.asks) &&
          depth.bestBidPriceTicks != null &&
          depth.bestAskPriceTicks != null
        ) {
          const synthetic = this.buildSyntheticBook(
            depth.bestBidPriceTicks,
            depth.bestAskPriceTicks,
          );
          this.bids = depth.bids?.length ? this.bids : synthetic.bids;
          this.asks = depth.asks?.length ? this.asks : synthetic.asks;
        }
        this.buffer.depth = undefined;
      }

      if (this.buffer.trades.length) {
        const incoming = this.buffer.trades.splice(0, this.buffer.trades.length);
        this.lastTradePrice = incoming[0]?.priceTicks ?? this.lastTradePrice;
        this.trades = [...incoming, ...this.trades].slice(0, 120);
        if (process.client) {
          const { $telegram } = useNuxtApp();
          $telegram?.hapticTrade();
        }
      }
    },
    buildSyntheticBook(bestBid: number, bestAsk: number) {
      const levels = 12;
      const step = Math.max((bestAsk - bestBid) / 4 || 0.5, 0.5);
      const bids: OrderLevel[] = [];
      const asks: OrderLevel[] = [];
      let bidTotal = 0;
      let askTotal = 0;
      for (let i = 0; i < levels; i += 1) {
        const bidPrice = bestBid - step * i;
        const askPrice = bestAsk + step * i;
        const bidAmount = Number((levels - i) * 0.4);
        const askAmount = Number((levels - i) * 0.4);
        bidTotal += bidAmount;
        askTotal += askAmount;
        bids.push({ price: bidPrice, amount: bidAmount, total: bidTotal, side: 'bid' });
        asks.push({ price: askPrice, amount: askAmount, total: askTotal, side: 'ask' });
      }
      return { bids, asks };
    },
  },
});
