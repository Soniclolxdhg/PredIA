import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CostingEngineService } from './costing-engine.service';

@UseGuards(JwtAuthGuard)
@Controller('costos/liquidacion')
export class CostingEngineController {
  constructor(private readonly costingEngineService: CostingEngineService) {}

  @Get(':idCiclo')
  obtenerEstructuraCostos(@Param('idCiclo', ParseIntPipe) idCiclo: number) {
    return this.costingEngineService.obtenerEstructuraCostosCiclo(idCiclo);
  }

  @Post(':idCiclo/consolidar')
  @HttpCode(HttpStatus.OK)
  consolidarLiquidacionCiclo(@Param('idCiclo', ParseIntPipe) idCiclo: number) {
    return this.costingEngineService.consolidarLiquidacionCiclo(idCiclo);
  }
}
