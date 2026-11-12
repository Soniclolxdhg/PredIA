import { Module } from '@nestjs/common';
import { CostLaborController } from './cost-labor.controller';
import { CostLaborService } from './cost-labor.service';

@Module({
  controllers: [CostLaborController],
  providers: [CostLaborService],
  exports: [CostLaborService],
})
export class CostLaborModule { }
