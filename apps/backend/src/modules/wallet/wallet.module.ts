import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [WalletController],
})
export class WalletModule {}
