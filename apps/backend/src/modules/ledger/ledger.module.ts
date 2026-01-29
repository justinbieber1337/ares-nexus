import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LedgerService } from './application/ledger.service';
import { LEDGER_TOKENS } from './ledger.tokens';
import { PrismaLedgerStore } from './infrastructure/prisma/prisma-ledger.store';

@Module({
  providers: [
    PrismaService,
    LedgerService,
    {
      provide: LEDGER_TOKENS.LEDGER_STORE,
      useClass: PrismaLedgerStore,
    },
  ],
  exports: [LedgerService],
})
export class LedgerModule {}
