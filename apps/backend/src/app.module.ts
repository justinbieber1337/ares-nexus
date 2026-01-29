import { Module } from '@nestjs/common';
import { MatchingEngineModule } from './modules/matching-engine/interfaces/matching-engine.module';

@Module({
  imports: [MatchingEngineModule],
})
export class AppModule {}
