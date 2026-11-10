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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstadoCiclo } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductionService } from './production.service';
import { CrearNaveDto } from './dto/crear-nave.dto';
import { ActualizarNaveDto } from './dto/actualizar-nave.dto';
import { CrearCicloDto } from './dto/crear-ciclo.dto';
import { CerrarCicloDto } from './dto/cerrar-ciclo.dto';
import { CrearLaborDto } from './dto/crear-labor.dto';
import { CrearCosechaDto } from './dto/crear-cosecha.dto';

@UseGuards(JwtAuthGuard)
@Controller('produccion')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // ==========================================
  // 1. ENDPOINTS NAVES (HU01)
  // ==========================================

  @Get('naves')
  listarNaves() {
    return this.productionService.listarNaves();
  }

  @Get('naves/:id')
  obtenerNavePorId(@Param('id', ParseIntPipe) id: number) {
    return this.productionService.obtenerNavePorId(id);
  }

  @Post('naves')
  @HttpCode(HttpStatus.CREATED)
  crearNave(@Body() dto: CrearNaveDto) {
    return this.productionService.crearNave(dto);
  }

  @Patch('naves/:id')
  actualizarNave(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarNaveDto) {
    return this.productionService.actualizarNave(id, dto);
  }

  // ==========================================
  // 2. ENDPOINTS CICLOS DE CULTIVO (HU01)
  // ==========================================

  @Get('ciclos')
  listarCiclos(
    @Query('idNave') idNave?: string,
    @Query('estado') estado?: EstadoCiclo,
  ) {
    const idNaveNumero = idNave ? parseInt(idNave, 10) : undefined;
    return this.productionService.listarCiclos(idNaveNumero, estado);
  }

  @Get('ciclos/:id')
  obtenerCicloPorId(@Param('id', ParseIntPipe) id: number) {
    return this.productionService.obtenerCicloPorId(id);
  }

  @Post('ciclos')
  @HttpCode(HttpStatus.CREATED)
  crearCiclo(@Body() dto: CrearCicloDto) {
    return this.productionService.crearCiclo(dto);
  }

  @Patch('ciclos/:id/cerrar')
  cerrarCiclo(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarCicloDto) {
    return this.productionService.cerrarCiclo(id, dto);
  }

  // ==========================================
  // 3. ENDPOINTS LABORES AGRÍCOLAS (HU02)
  // ==========================================

  @Post('labores')
  @HttpCode(HttpStatus.CREATED)
  registrarLabor(@Request() req: { user: { idUsuario: number } }, @Body() dto: CrearLaborDto) {
    return this.productionService.registrarLabor(req.user.idUsuario, dto);
  }

  @Get('ciclos/:id/labores')
  listarLaboresPorCiclo(@Param('id', ParseIntPipe) id: number) {
    return this.productionService.listarLaboresPorCiclo(id);
  }

  // ==========================================
  // 4. ENDPOINTS PESAJE DE COSECHA (HU03)
  // ==========================================

  @Post('cosechas')
  @HttpCode(HttpStatus.CREATED)
  registrarCosecha(@Request() req: { user: { idUsuario: number } }, @Body() dto: CrearCosechaDto) {
    return this.productionService.registrarCosecha(req.user.idUsuario, dto);
  }

  @Get('ciclos/:id/cosechas')
  listarCosechasPorCiclo(@Param('id', ParseIntPipe) id: number) {
    return this.productionService.listarCosechasPorCiclo(id);
  }

  @Get('cosechas/disponibles')
  obtenerStockCosechasDisponibles() {
    return this.productionService.obtenerStockCosechasDisponibles();
  }

  @Post('sembrar-naves')
  sembrarNaves() {
    return this.productionService.sembrarNavesBase();
  }
}

