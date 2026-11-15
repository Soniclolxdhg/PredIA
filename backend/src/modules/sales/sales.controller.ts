import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstadoDespacho } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { EmitirNotaVentaDto } from './dto/emitir-nota-venta.dto';
import { ActualizarDespachoDto } from './dto/actualizar-despacho.dto';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ==========================================
  // 1. ENDPOINTS CLIENTES (HU08)
  // ==========================================

  @Post('clientes')
  @HttpCode(HttpStatus.CREATED)
  crearCliente(@Body() dto: CrearClienteDto) {
    return this.salesService.crearCliente(dto);
  }

  @Get('clientes')
  listarClientes(@Query('busqueda') busqueda?: string) {
    return this.salesService.listarClientes(busqueda);
  }

  @Get('clientes/:id')
  obtenerClientePorId(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.obtenerClientePorId(id);
  }

  @Patch('clientes/:id')
  actualizarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.salesService.actualizarCliente(id, dto);
  }

  @Delete('clientes/:id')
  eliminarCliente(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.eliminarCliente(id);
  }

  // ==========================================
  // 2. ENDPOINTS STOCK Y MÉTRICAS (HU10)
  // ==========================================

  @Get('stock-disponible')
  obtenerStockDisponibleParaVenta() {
    return this.salesService.obtenerStockDisponibleParaVenta();
  }

  @Get('metricas')
  obtenerMetricasVentas() {
    return this.salesService.obtenerMetricasVentas();
  }

  // ==========================================
  // 3. ENDPOINTS NOTAS DE VENTA (HU10)
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  emitirNotaVenta(
    @Request() req: { user: { idUsuario: number } },
    @Body() dto: EmitirNotaVentaDto,
  ) {
    return this.salesService.emitirNotaVenta(req.user.idUsuario, dto);
  }

  @Get()
  listarVentas(
    @Query('idCliente') idCliente?: string,
    @Query('estadoDespacho') estadoDespacho?: EstadoDespacho,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.salesService.listarVentas({
      idCliente: idCliente ? parseInt(idCliente, 10) : undefined,
      estadoDespacho,
      fechaDesde,
      fechaHasta,
    });
  }

  @Get(':id')
  obtenerVentaPorId(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.obtenerVentaPorId(id);
  }

  @Patch(':id/despacho')
  actualizarEstadoDespacho(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarDespachoDto,
  ) {
    return this.salesService.actualizarEstadoDespacho(id, dto);
  }
}

