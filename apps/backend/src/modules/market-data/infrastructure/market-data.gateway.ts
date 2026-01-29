import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';

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

@WebSocketGateway({
  path: '/ws/market-data',
  transports: ['websocket'],
})
export class MarketDataGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly depthUpdates$ = new Subject<MarketDepthUpdate>();

  constructor() {
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
    this.server.to(this.marketRoom(update.marketId)).emit('trades', update.trades);
  }

  publishUserUpdate(userId: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('user_update', payload);
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
        .emit('market_depth', {
          ...update,
          updatedAt: update.updatedAt.toISOString(),
        });
    }
  }

  private marketRoom(marketId: string) {
    return `market:${marketId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
