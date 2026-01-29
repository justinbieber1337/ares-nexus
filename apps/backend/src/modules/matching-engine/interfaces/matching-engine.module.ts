import { Module } from '@nestjs/common';
import { MatchingEngineService } from '../domain/services/matching-engine.service';
import { PlaceOrderUseCase } from '../application/use-cases/place-order.usecase';
import { RedisOrderBookRepository } from '../infrastructure/redis/redis-order-book.repository';
import { MATCHING_ENGINE_TOKENS } from './matching-engine.tokens';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { PrismaLedgerStore } from '../../ledger/infrastructure/prisma/prisma-ledger.store';
import { LedgerService } from '../../ledger/application/ledger.service';
import { LEDGER_TOKENS } from '../../ledger/ledger.tokens';
import { IdempotencyService } from '../../idempotency/infrastructure/idempotency.service';
import { MarketDataGateway } from '../../market-data/infrastructure/market-data.gateway';

@Module({
  providers: [
    MatchingEngineService,
    PlaceOrderUseCase,
    PrismaService,
    LedgerService,
    IdempotencyService,
    MarketDataGateway,
    {
      provide: MATCHING_ENGINE_TOKENS.ORDER_BOOK_REPOSITORY,
      useClass: RedisOrderBookRepository,
    },
    {
      provide: LEDGER_TOKENS.LEDGER_STORE,
      useClass: PrismaLedgerStore,
    },
  ],
  exports: [PlaceOrderUseCase],
})
export class MatchingEngineModule {}
