import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogsService } from './catalogs.service';
import { CrearVariedadDto } from './dto/crear-variedad.dto';
import { ActualizarVariedadDto } from './dto/actualizar-variedad.dto';
import { CrearEstructuraDto } from './dto/crear-estructura.dto';
import { ActualizarEstructuraDto } from './dto/actualizar-estructura.dto';
import { CrearUnidadDto } from './dto/crear-unidad.dto';
import { ActualizarUnidadDto } from './dto/actualizar-unidad.dto';

@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  // ==========================================
  // 1. VARIEDADES AGRÍCOLAS
  // ==========================================

  @Post('variedades')
  @HttpCode(HttpStatus.CREATED)
  crearVariedad(@Body() dto: CrearVariedadDto) {
    return this.catalogsService.crearVariedad(dto);
  }

  @Get('variedades')
  listarVariedades(
    @Query('soloActivas') soloActivas?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const filtroActivas =
      soloActivas !== undefined ? soloActivas === 'true' || soloActivas === '1' : undefined;
    return this.catalogsService.listarVariedades(filtroActivas, busqueda);
  }

  @Post('variedades/sembrar')
  @HttpCode(HttpStatus.OK)
  sembrarVariedadesBase() {
    return this.catalogsService.sembrarVariedadesBase();
  }

  @Get('variedades/:id')
  obtenerVariedadPorId(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.obtenerVariedadPorId(id);
  }

  @Patch('variedades/:id')
  actualizarVariedadPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarVariedadDto,
  ) {
    return this.catalogsService.actualizarVariedad(id, dto);
  }

  @Put('variedades/:id')
  actualizarVariedadPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarVariedadDto,
  ) {
    return this.catalogsService.actualizarVariedad(id, dto);
  }

  @Delete('variedades/:id')
  eliminarVariedad(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.eliminarVariedad(id);
  }

  // ==========================================
  // 2. TIPOS DE ESTRUCTURA DE NAVES
  // ==========================================

  @Post('estructuras')
  @HttpCode(HttpStatus.CREATED)
  crearEstructura(@Body() dto: CrearEstructuraDto) {
    return this.catalogsService.crearEstructura(dto);
  }

  @Get('estructuras')
  listarEstructuras(
    @Query('soloActivas') soloActivas?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const filtroActivas =
      soloActivas !== undefined ? soloActivas === 'true' || soloActivas === '1' : undefined;
    return this.catalogsService.listarEstructuras(filtroActivas, busqueda);
  }

  @Post('estructuras/sembrar')
  @HttpCode(HttpStatus.OK)
  sembrarEstructurasBase() {
    return this.catalogsService.sembrarEstructurasBase();
  }

  @Get('estructuras/:id')
  obtenerEstructuraPorId(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.obtenerEstructuraPorId(id);
  }

  @Patch('estructuras/:id')
  actualizarEstructuraPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstructuraDto,
  ) {
    return this.catalogsService.actualizarEstructura(id, dto);
  }

  @Put('estructuras/:id')
  actualizarEstructuraPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstructuraDto,
  ) {
    return this.catalogsService.actualizarEstructura(id, dto);
  }

  @Delete('estructuras/:id')
  eliminarEstructura(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.eliminarEstructura(id);
  }

  // ==========================================
  // 3. UNIDADES DE MEDIDA
  // ==========================================

  @Post('unidades')
  @HttpCode(HttpStatus.CREATED)
  crearUnidad(@Body() dto: CrearUnidadDto) {
    return this.catalogsService.crearUnidad(dto);
  }

  @Get('unidades')
  listarUnidades(
    @Query('soloActivas') soloActivas?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const filtroActivas =
      soloActivas !== undefined ? soloActivas === 'true' || soloActivas === '1' : undefined;
    return this.catalogsService.listarUnidades(filtroActivas, busqueda);
  }

  @Post('unidades/sembrar')
  @HttpCode(HttpStatus.OK)
  sembrarUnidadesBase() {
    return this.catalogsService.sembrarUnidadesBase();
  }

  @Get('unidades/:id')
  obtenerUnidadPorId(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.obtenerUnidadPorId(id);
  }

  @Patch('unidades/:id')
  actualizarUnidadPatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUnidadDto,
  ) {
    return this.catalogsService.actualizarUnidad(id, dto);
  }

  @Put('unidades/:id')
  actualizarUnidadPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUnidadDto,
  ) {
    return this.catalogsService.actualizarUnidad(id, dto);
  }

  @Delete('unidades/:id')
  eliminarUnidad(@Param('id', ParseIntPipe) id: number) {
    return this.catalogsService.eliminarUnidad(id);
  }
}
