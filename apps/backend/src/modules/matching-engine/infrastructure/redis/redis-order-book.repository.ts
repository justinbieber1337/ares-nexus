import { Injectable } from '@nestjs/common';
import { Order } from '../../domain/entities/order';
import { OrderBookRepository } from '../../application/ports/order-book.repository';
import { RedisClient } from './redis.types';

const PRICE_MULTIPLIER = 1_000_000_000;

@Injectable()
export class RedisOrderBookRepository implements OrderBookRepository {
  constructor(private readonly redis: RedisClient) {}

  async add(order: Order): Promise<void> {
    const orderKey = this.orderKey(order.id);
    const bookKey = this.bookKey(order.marketId, order.side);
    const score = this.scoreFor(order);

    await this.redis.hset(orderKey, this.serialize(order));
    await this.redis.zadd(bookKey, score, order.id);
  }

  async update(order: Order): Promise<void> {
    await this.redis.hset(this.orderKey(order.id), this.serialize(order));
  }

  async remove(order: Order): Promise<void> {
    await this.redis.zrem(this.bookKey(order.marketId, order.side), order.id);
    await this.redis.del(this.orderKey(order.id));
  }

  async peekBestOpposite(order: Order): Promise<Order | null> {
    const oppositeSide = order.side === 'bid' ? 'ask' : 'bid';
    const ids = await this.redis.zrange(
      this.bookKey(order.marketId, oppositeSide),
      0,
      0,
    );
    if (!ids.length) return null;
    return this.getOrder(ids[0]);
  }

  async getBestBidPrice(marketId: string): Promise<number | null> {
    const ids = await this.redis.zrange(this.bookKey(marketId, 'bid'), 0, 0);
    if (!ids.length) return null;
    const order = await this.getOrder(ids[0]);
    return order?.priceTicks ?? null;
  }

  async getBestAskPrice(marketId: string): Promise<number | null> {
    const ids = await this.redis.zrange(this.bookKey(marketId, 'ask'), 0, 0);
    if (!ids.length) return null;
    const order = await this.getOrder(ids[0]);
    return order?.priceTicks ?? null;
  }

  async nextTimeSequence(marketId: string): Promise<number> {
    return this.redis.incr(`ob:seq:${marketId}`);
  }

  nextTradeId(): string {
    return `tr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  private async getOrder(orderId: string): Promise<Order | null> {
    const data = await this.redis.hgetall(this.orderKey(orderId));
    if (!data || !data.id) return null;
    return new Order({
      id: data.id,
      marketId: data.marketId,
      userId: data.userId,
      side: data.side as 'bid' | 'ask',
      type: data.type as 'limit' | 'market',
      priceTicks: Number(data.priceTicks),
      quantity: Number(data.quantity),
      remainingQuantity: Number(data.remainingQuantity),
      createdAt: new Date(Number(data.createdAt)),
      timeSequence: Number(data.timeSequence),
    });
  }

  /**
   * Price-time priority via a monotonic score:
   * - For bids, higher price should be earlier, so the score is negative.
   * - For asks, lower price should be earlier, so the score is positive.
   * - A per-market sequence is appended to preserve FIFO within price.
   */
  private scoreFor(order: Order): number {
    const priceComponent =
      order.side === 'bid' ? -order.priceTicks : order.priceTicks;
    return priceComponent * PRICE_MULTIPLIER + order.timeSequence;
  }

  private serialize(order: Order): Record<string, string | number> {
    return {
      id: order.id,
      marketId: order.marketId,
      userId: order.userId,
      side: order.side,
      type: order.type,
      priceTicks: order.priceTicks,
      quantity: order.quantity,
      remainingQuantity: order.remainingQuantity,
      createdAt: order.createdAt.getTime(),
      timeSequence: order.timeSequence,
    };
  }

  private orderKey(orderId: string) {
    return `ob:order:${orderId}`;
  }

  private bookKey(marketId: string, side: 'bid' | 'ask') {
    return `ob:book:${marketId}:${side}`;
  }
}
