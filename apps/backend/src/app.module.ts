import { Module } from '@nestjs/common';
import { MatchingEngineModule } from './modules/matching-engine/interfaces/matching-engine.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [MatchingEngineModule, WalletModule],
})
export class AppModule {}
