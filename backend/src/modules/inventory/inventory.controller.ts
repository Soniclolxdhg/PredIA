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
import { CategoriaInsumo, TipoMovimientoBodega, EstadoAlerta } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { CrearInsumoDto } from './dto/crear-insumo.dto';
import { ActualizarInsumoDto } from './dto/actualizar-insumo.dto';
import { RegistrarMovimientoDto } from './dto/registrar-movimiento.dto';

@UseGuards(JwtAuthGuard)
@Controller('inventario')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ==========================================
  // 1. ENDPOINTS CATÁLOGO INSUMOS
  // ==========================================

  @Get('insumos')
  listarInsumos(
    @Query('categoria') categoria?: CategoriaInsumo,
    @Query('soloStockBajo') soloStockBajo?: string,
  ) {
    const filtrarStockBajo = soloStockBajo === 'true';
    return this.inventoryService.listarInsumos(categoria, filtrarStockBajo);
  }

  @Get('insumos/:id')
  obtenerInsumoPorId(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.obtenerInsumoPorId(id);
  }

  @Post('insumos')
  @HttpCode(HttpStatus.CREATED)
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.inventoryService.crearInsumo(dto);
  }

  @Patch('insumos/:id')
  actualizarInsumo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarInsumoDto,
  ) {
    return this.inventoryService.actualizarInsumo(id, dto);
  }

  // ==========================================
  // 2. ENDPOINTS KARDEX & MOVIMIENTOS (HU04)
  // ==========================================

  @Post('movimientos')
  @HttpCode(HttpStatus.CREATED)
  registrarMovimiento(
    @Request() req: { user: { idUsuario: number } },
    @Body() dto: RegistrarMovimientoDto,
  ) {
    return this.inventoryService.registrarMovimiento(req.user.idUsuario, dto);
  }

  @Get('movimientos')
  consultarKardex(
    @Query('idInsumo') idInsumo?: string,
    @Query('tipoMovimiento') tipoMovimiento?: TipoMovimientoBodega,
  ) {
    const idInsumoNum = idInsumo ? parseInt(idInsumo, 10) : undefined;
    return this.inventoryService.consultarKardex(idInsumoNum, tipoMovimiento);
  }

  // ==========================================
  // 3. ENDPOINTS ALERTAS STOCK CRÍTICO (HU05)
  // ==========================================

  @Get('alertas')
  listarAlertas(@Query('estado') estado?: EstadoAlerta) {
    return this.inventoryService.listarAlertas(estado);
  }

  @Patch('alertas/:id/atender')
  atenderAlerta(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.atenderAlerta(id);
  }
}

