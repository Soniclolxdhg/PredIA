import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CrearCicloDto } from './dto/crear-ciclo.dto';
import { CrearNaveDto } from './dto/crear-nave.dto';

/**
 * Controlador REST para el Módulo de Producción e Invernaderos (HU01).
 * Rutas expuestas bajo el prefijo global /api/produccion
 */
@Controller('produccion')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  /**
   * GET /api/produccion/naves
   * Retorna la lista real de naves e invernaderos desde Supabase.
   */
  @Get('naves')
  async obtenerNaves() {
    return this.productionService.obtenerNaves();
  }

  /**
   * POST /api/produccion/naves
   * Registra una nueva nave en Supabase.
   */
  @Post('naves')
  async crearNave(@Body() dto: CrearNaveDto) {
    return this.productionService.crearNave(dto);
  }

  /**
   * GET /api/produccion/ciclos
   * Retorna la lista real de ciclos de cultivo desde Supabase.
   */
  @Get('ciclos')
  async obtenerCiclos() {
    return this.productionService.obtenerCiclos();
  }

  /**
   * POST /api/produccion/ciclos
   * Apertura un nuevo ciclo en Supabase aplicando validaciones de negocio.
   */
  @Post('ciclos')
  async crearCiclo(@Body() dto: CrearCicloDto) {
    return this.productionService.crearCiclo(dto);
  }

  /**
   * POST /api/produccion/sembrar-naves
   * Siembra las 4 naves oficiales de Santa Laura Ltda. en Supabase si la tabla está vacía.
   */
  @Post('sembrar-naves')
  async sembrarNaves() {
    return this.productionService.sembrarNavesBase();
  }
}
