import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('ejecutivo')
  obtenerDashboardEjecutivo() {
    return this.analyticsService.obtenerDashboardEjecutivo();
  }

  @Get('kpis')
  obtenerKpisDirectivos() {
    return this.analyticsService.obtenerKpisDirectivos();
  }

  @Get('graficos')
  obtenerGraficosChartJs() {
    return this.analyticsService.obtenerGraficosChartJs();
  }

  @Get('proyecciones')
  obtenerProyeccionesCiclos() {
    return this.analyticsService.obtenerProyeccionesCiclos();
  }
}

