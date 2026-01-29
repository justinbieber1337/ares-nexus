import { Inject, Injectable } from '@nestjs/common';
import { MATCHING_ENGINE_TOKENS } from '../../interfaces/matching-engine.tokens';
import { Order } from '../../domain/entities/order';
import { MatchingEngineService } from '../../domain/services/matching-engine.service';
import { OrderBookRepository } from '../ports/order-book.repository';
import { PlaceOrderCommand } from '../dtos/place-order.dto';
import { OrderBookChangedEvent } from '../../domain/events/order-book-changed.event';
import { LedgerService } from '../../../ledger/application/ledger.service';
import { IdempotencyService } from '../../../idempotency/infrastructure/idempotency.service';
import { MarketDataGateway } from '../../../market-data/infrastructure/market-data.gateway';

@Injectable()
export class PlaceOrderUseCase {
  constructor(
    @Inject(MATCHING_ENGINE_TOKENS.ORDER_BOOK_REPOSITORY)
    private readonly orderBookRepository: OrderBookRepository,
    private readonly matchingEngineService: MatchingEngineService,
    private readonly ledgerService: LedgerService,
    private readonly idempotencyService: IdempotencyService,
    private readonly marketDataGateway: MarketDataGateway,
  ) {}

  async execute(command: PlaceOrderCommand) {
    return this.idempotencyService.execute({
      scope: 'place-order',
      key: command.idempotencyKey,
      requestHash: command.requestHash,
      handler: async () => {
        const previousBestBid = await this.orderBookRepository.getBestBidPrice(
          command.marketId,
        );
        const previousBestAsk = await this.orderBookRepository.getBestAskPrice(
          command.marketId,
        );

        const timeSequence = await this.orderBookRepository.nextTimeSequence(
          command.marketId,
        );
        const order = new Order({
          id: command.orderId,
          marketId: command.marketId,
          userId: command.userId,
          side: command.side,
          type: command.type,
          priceTicks: command.priceTicks,
          quantity: command.quantity,
          remainingQuantity: command.quantity,
          createdAt: new Date(),
          timeSequence,
        });

        const idempotencyKeyId = await this.ledgerService.createIdempotencyKey(
          command.accountId,
          'place-order',
          command.idempotencyKey,
          command.requestHash,
        );

        await this.ledgerService.reserveForOrder({
          accountId: command.accountId,
          marketId: command.marketId,
          side: command.side,
          priceTicks: command.priceTicks,
          quantity: command.quantity,
          referenceId: command.orderId,
          idempotencyKeyId,
        });

        const result = await this.matchingEngineService.match(order);

        if (result.remainingOrder && result.remainingOrder.type === 'limit') {
          await this.orderBookRepository.add(result.remainingOrder);
        }

        const trades = result.trades.map((trade) => trade.toPrimitives());

        if (trades.length) {
          await this.ledgerService.settleTrades({
            marketId: command.marketId,
            trades,
            idempotencyKeyId,
          });
        }

        if (result.remainingOrder && result.remainingOrder.type === 'market') {
          await this.ledgerService.releaseOrderRemainder({
            accountId: command.accountId,
            marketId: command.marketId,
            side: command.side,
            priceTicks: command.priceTicks,
            remainingQuantity: result.remainingOrder.remainingQuantity,
            referenceId: command.orderId,
            idempotencyKeyId,
          });
        }

        const event: OrderBookChangedEvent = {
          marketId: command.marketId,
          bestBidPriceTicks: await this.orderBookRepository.getBestBidPrice(
            command.marketId,
          ),
          bestAskPriceTicks: await this.orderBookRepository.getBestAskPrice(
            command.marketId,
          ),
          updatedAt: new Date(),
        };

        const orderBookChanged =
          event.bestBidPriceTicks !== previousBestBid ||
          event.bestAskPriceTicks !== previousBestAsk;
        if (orderBookChanged) {
          this.marketDataGateway.publishOrderBook(event);
        }
        if (trades.length) {
          this.marketDataGateway.publishTrades({
            marketId: command.marketId,
            trades,
          });
        }

        return {
          trades,
          orderBookEvent: event,
        };
      },
    });
  }
}
