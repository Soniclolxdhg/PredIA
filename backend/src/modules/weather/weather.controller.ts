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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';
import { SincronizarClimaDto } from './dto/sincronizar-clima.dto';
import { AtenderAlertaDto } from './dto/atender-alerta.dto';

@UseGuards(JwtAuthGuard)
@Controller(['clima', 'api/clima'])
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('pronostico')
  obtenerPronostico7Dias() {
    return this.weatherService.obtenerPronostico7Dias();
  }

  @Post('sincronizar')
  @HttpCode(HttpStatus.OK)
  sincronizarClima(@Body() dto: SincronizarClimaDto) {
    return this.weatherService.sincronizarPronostico(dto);
  }

  @Get('alertas')
  obtenerAlertasHeladas(@Query('soloAbiertas') soloAbiertas?: string) {
    const filtrarAbiertas = soloAbiertas === 'true' || soloAbiertas === '1';
    return this.weatherService.obtenerAlertasHeladas(filtrarAbiertas);
  }

  @Patch('alertas/:id/atender')
  atenderAlerta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtenderAlertaDto,
  ) {
    return this.weatherService.atenderAlerta(id, dto);
  }
}

