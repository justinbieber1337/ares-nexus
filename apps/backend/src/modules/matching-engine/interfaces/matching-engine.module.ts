import { Module } from '@nestjs/common';
import { MatchingEngineService } from '../domain/services/matching-engine.service';
import { PlaceOrderUseCase } from '../application/use-cases/place-order.usecase';
import { RedisOrderBookRepository } from '../infrastructure/redis/redis-order-book.repository';
import { MATCHING_ENGINE_TOKENS } from './matching-engine.tokens';
import { IdempotencyService } from '../../idempotency/infrastructure/idempotency.service';
import { MarketDataGateway } from '../../market-data/infrastructure/market-data.gateway';
import { LedgerModule } from '../../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [
    MatchingEngineService,
    PlaceOrderUseCase,
    IdempotencyService,
    MarketDataGateway,
    {
      provide: MATCHING_ENGINE_TOKENS.ORDER_BOOK_REPOSITORY,
      useClass: RedisOrderBookRepository,
    },
  ],
  exports: [PlaceOrderUseCase],
})
export class MatchingEngineModule {}
