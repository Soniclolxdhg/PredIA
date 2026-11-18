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

@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

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
}
