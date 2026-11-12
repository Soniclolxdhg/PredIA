import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstadoPago } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CostLaborService } from './cost-labor.service';
import { CrearTrabajadorDto } from './dto/crear-trabajador.dto';
import { ActualizarTrabajadorDto } from './dto/actualizar-trabajador.dto';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { CrearCostoIndirectoDto } from './dto/crear-costo-indirecto.dto';
import { ProrratearGastoDto } from './dto/prorratear-gasto.dto';

@UseGuards(JwtAuthGuard)
@Controller('costos')
export class CostLaborController {
  constructor(private readonly costLaborService: CostLaborService) {}

  // ==========================================
  // 1. ENDPOINTS TRABAJADORES
  // ==========================================

  @Get('trabajadores')
  listarTrabajadores(@Query('activo') activo?: string) {
    const activoBool = activo !== undefined ? activo === 'true' : undefined;
    return this.costLaborService.listarTrabajadores(activoBool);
  }

  @Get('trabajadores/:id')
  obtenerTrabajadorPorId(@Param('id', ParseIntPipe) id: number) {
    return this.costLaborService.obtenerTrabajadorPorId(id);
  }

  @Post('trabajadores')
  @HttpCode(HttpStatus.CREATED)
  crearTrabajador(@Body() dto: CrearTrabajadorDto) {
    return this.costLaborService.crearTrabajador(dto);
  }

  @Patch('trabajadores/:id')
  actualizarTrabajador(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTrabajadorDto,
  ) {
    return this.costLaborService.actualizarTrabajador(id, dto);
  }

  // ==========================================
  // 2. ENDPOINTS ASISTENCIAS Y JORNALES (HU06)
  // ==========================================

  @Post('asistencias')
  @HttpCode(HttpStatus.CREATED)
  registrarAsistencia(@Body() dto: RegistrarAsistenciaDto) {
    return this.costLaborService.registrarAsistencia(dto);
  }

  @Get('asistencias')
  listarAsistencias(
    @Query('idCiclo') idCiclo?: string,
    @Query('idTrabajador') idTrabajador?: string,
    @Query('estadoPago') estadoPago?: EstadoPago,
  ) {
    const idCicloNum = idCiclo ? parseInt(idCiclo, 10) : undefined;
    const idTrabajadorNum = idTrabajador ? parseInt(idTrabajador, 10) : undefined;
    return this.costLaborService.listarAsistencias(idCicloNum, idTrabajadorNum, estadoPago);
  }

  @Patch('asistencias/:id/estado-pago')
  cambiarEstadoPago(
    @Param('id', ParseIntPipe) id: number,
    @Body('estadoPago') estadoPago: EstadoPago,
  ) {
    return this.costLaborService.cambiarEstadoPago(id, estadoPago);
  }

  // ==========================================
  // 3. ENDPOINTS COSTOS INDIRECTOS (HU07)
  // ==========================================

  @Post('indirectos')
  @HttpCode(HttpStatus.CREATED)
  crearCostoIndirecto(@Body() dto: CrearCostoIndirectoDto) {
    return this.costLaborService.crearCostoIndirecto(dto);
  }

  @Post('indirectos/prorratear')
  @HttpCode(HttpStatus.CREATED)
  prorratearGastoEntreCiclosActivos(@Body() dto: ProrratearGastoDto) {
    return this.costLaborService.prorratearGastoEntreCiclosActivos(dto);
  }

  @Get('indirectos')
  listarCostosIndirectos(@Query('idCiclo') idCiclo?: string) {
    const idCicloNum = idCiclo ? parseInt(idCiclo, 10) : undefined;
    return this.costLaborService.listarCostosIndirectos(idCicloNum);
  }
}
