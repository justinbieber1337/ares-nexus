import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import { PlaceOrderUseCase } from '../../matching-engine/application/use-cases/place-order.usecase';

export interface MarketDepthUpdate {
  marketId: string;
  bestBidPriceTicks: number | null;
  bestAskPriceTicks: number | null;
  updatedAt: Date;
}

export interface TradeUpdate {
  marketId: string;
  trades: unknown[];
}

export interface MarketDataUpdatePayload {
  marketId: string;
  orderBook?: MarketDepthUpdate;
  trades?: unknown[];
}

@WebSocketGateway({
  path: '/ws/market-data',
  transports: ['websocket'],
  cors: { origin: '*' },
})
export class MarketDataGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly depthUpdates$ = new Subject<MarketDepthUpdate>();

  constructor(private readonly placeOrderUseCase: PlaceOrderUseCase) {
    this.depthUpdates$
      .pipe(bufferTime(75))
      .subscribe((updates) => this.flushDepthUpdates(updates));
  }

  handleConnection(client: Socket) {
    const marketId = client.handshake.query.marketId as string | undefined;
    const userId = client.handshake.query.userId as string | undefined;
    if (marketId) {
      client.join(this.marketRoom(marketId));
    }
    if (userId) {
      client.join(this.userRoom(userId));
    }
  }

  publishOrderBook(update: MarketDepthUpdate) {
    this.depthUpdates$.next(update);
  }

  publishTrades(update: TradeUpdate) {
    this.server
      .to(this.marketRoom(update.marketId))
      .emit('MARKET_DATA_UPDATE', {
        marketId: update.marketId,
        trades: update.trades,
      } satisfies MarketDataUpdatePayload);
  }

  publishUserUpdate(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('user_update', payload);
  }

  @SubscribeMessage('PLACE_ORDER')
  async handlePlaceOrder(client: Socket, payload: any) {
    try {
      const result = await this.placeOrderUseCase.execute(payload);
      if (result.orderBookChanged) {
        this.publishOrderBook({
          marketId: payload.marketId,
          bestBidPriceTicks: result.orderBookEvent.bestBidPriceTicks,
          bestAskPriceTicks: result.orderBookEvent.bestAskPriceTicks,
          updatedAt: result.orderBookEvent.updatedAt,
        });
      }
      if (result.trades.length) {
        this.publishTrades({
          marketId: payload.marketId,
          trades: result.trades,
        });
      }

      client.emit('ORDER_ACK', {
        orderId: payload.orderId,
        marketId: payload.marketId,
      });
    } catch (error: any) {
      client.emit('ORDER_ERROR', {
        message: error?.message ?? 'Order failed',
      });
    }
  }

  private flushDepthUpdates(updates: MarketDepthUpdate[]) {
    if (!updates.length) return;
    const latestByMarket = new Map<string, MarketDepthUpdate>();
    for (const update of updates) {
      latestByMarket.set(update.marketId, update);
    }
    for (const update of latestByMarket.values()) {
      this.server
        .to(this.marketRoom(update.marketId))
        .emit('MARKET_DATA_UPDATE', {
          marketId: update.marketId,
          orderBook: {
            ...update,
            updatedAt: update.updatedAt.toISOString(),
          },
        } satisfies MarketDataUpdatePayload);
    }
  }

  private marketRoom(marketId: string) {
    return `market:${marketId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
