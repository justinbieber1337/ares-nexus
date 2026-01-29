import { Order } from '../../domain/entities/order';

export interface OrderBookRepository {
  add(order: Order): Promise<void>;
  update(order: Order): Promise<void>;
  remove(order: Order): Promise<void>;
  peekBestOpposite(order: Order): Promise<Order | null>;
  getBestBidPrice(marketId: string): Promise<number | null>;
  getBestAskPrice(marketId: string): Promise<number | null>;
  nextTimeSequence(marketId: string): Promise<number>;
  nextTradeId(): string;
}
