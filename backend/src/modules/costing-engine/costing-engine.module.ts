import { Module } from '@nestjs/common';
import { CostingEngineController } from './costing-engine.controller';
import { CostingEngineService } from './costing-engine.service';

@Module({
  controllers: [CostingEngineController],
  providers: [CostingEngineService],
  exports: [CostingEngineService],
})
export class CostingEngineModule {}
