import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../entities/order';
import { Trade } from '../entities/trade';
import { OrderBookRepository } from '../../application/ports/order-book.repository';
import { MATCHING_ENGINE_TOKENS } from '../../interfaces/matching-engine.tokens';

export interface MatchResult {
  trades: Trade[];
  remainingOrder: Order | null;
}

@Injectable()
export class MatchingEngineService {
  constructor(
    @Inject(MATCHING_ENGINE_TOKENS.ORDER_BOOK_REPOSITORY)
    private readonly orderBookRepository: OrderBookRepository,
  ) {}

  /**
   * Match a taker order against the opposite book using price-time priority.
   * The repository controls ordering by price and sequence, while this loop
   * manages the fill logic and updates remaining quantities.
   */
  async match(order: Order): Promise<MatchResult> {
    const trades: Trade[] = [];
    let remainingOrder = order;

    while (!remainingOrder.isFilled()) {
      const bestOpposite = await this.orderBookRepository.peekBestOpposite(remainingOrder);
      if (!bestOpposite) break;
      if (!this.isCrossing(remainingOrder, bestOpposite)) break;

      const tradeQuantity = Math.min(
        remainingOrder.remainingQuantity,
        bestOpposite.remainingQuantity,
      );

      const trade = new Trade({
        id: this.orderBookRepository.nextTradeId(),
        marketId: remainingOrder.marketId,
        takerOrderId: remainingOrder.id,
        makerOrderId: bestOpposite.id,
        takerUserId: remainingOrder.userId,
        makerUserId: bestOpposite.userId,
        side: remainingOrder.side,
        priceTicks: bestOpposite.priceTicks,
        quantity: tradeQuantity,
        executedAt: new Date(),
      });

      remainingOrder.fill(tradeQuantity);
      bestOpposite.fill(tradeQuantity);
      trades.push(trade);

      if (bestOpposite.isFilled()) {
        await this.orderBookRepository.remove(bestOpposite);
      } else {
        await this.orderBookRepository.update(bestOpposite);
      }
    }

    return {
      trades,
      remainingOrder: remainingOrder.isFilled() ? null : remainingOrder,
    };
  }

  private isCrossing(taker: Order, maker: Order): boolean {
    if (taker.side === 'bid') {
      return taker.type === 'market' || taker.priceTicks >= maker.priceTicks;
    }
    return taker.type === 'market' || taker.priceTicks <= maker.priceTicks;
  }
}
