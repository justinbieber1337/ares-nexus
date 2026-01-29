import { io, Socket } from 'socket.io-client';
import { toast } from 'vue-sonner';
import { useMarketStore, MarketDepthPayload, TradePayload, MarketDataUpdate } from '~/stores/market';

export default defineNuxtPlugin(() => {
  if (!process.client) return;
  const config = useRuntimeConfig();
  const marketStore = useMarketStore();

  const marketId = config.public.defaultMarketId;
  marketStore.setMarket(marketId);

  const socket: Socket = io(config.public.wsUrl, {
    path: config.public.wsPath,
    transports: ['websocket'],
    query: { marketId },
  });

  socket.on('MARKET_DATA_UPDATE', (payload: MarketDataUpdate) => {
    marketStore.applyMarketDataUpdate(payload);
  });

  socket.on('market_depth', (payload: MarketDepthPayload) => {
    marketStore.enqueueDepth(payload);
  });

  socket.on('trades', (trades: TradePayload[]) => {
    marketStore.enqueueTrades(trades);
  });

  socket.on('ORDER_ACK', () => {
    toast.success('Order accepted');
  });

  socket.on('ORDER_ERROR', (payload: { message?: string }) => {
    toast.error(payload?.message ?? 'Order rejected');
  });

  return {
    provide: {
      socket,
    },
  };
});
