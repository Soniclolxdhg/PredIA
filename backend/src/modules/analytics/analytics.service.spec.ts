import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoCiclo,
  EstadoNave,
  EstadoAlerta,
  TipoAlerta,
  EstadoDespacho,
  NivelRiesgoClimatico,
} from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: {
    nave: { findMany: jest.Mock };
    cicloCultivo: { findMany: jest.Mock };
    cosecha: { findMany: jest.Mock };
    movimientoBodega: { findMany: jest.Mock };
    asistenciaJornal: { findMany: jest.Mock };
    costoIndirecto: { findMany: jest.Mock };
    venta: { findMany: jest.Mock };
    alerta: { findMany: jest.Mock };
    proyeccionCiclo: { create: jest.Mock };
  };
  let weatherService: {
    obtenerPronostico7Dias: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      nave: jest.fn() as any,
      cicloCultivo: jest.fn() as any,
      cosecha: jest.fn() as any,
      movimientoBodega: jest.fn() as any,
      asistenciaJornal: jest.fn() as any,
      costoIndirecto: jest.fn() as any,
      venta: jest.fn() as any,
      alerta: jest.fn() as any,
      proyeccionCiclo: jest.fn() as any,
    };

    prisma.nave = {
      findMany: jest.fn().mockResolvedValue([
        {
          idNave: 1,
          codigoNave: 'N-01',
          nombre: 'Nave Cherry',
          superficieM2: 1000,
          estado: EstadoNave.EN_CULTIVO,
          ciclosCultivo: [
            {
              cosechas: [{ kilosNetos: 3500 }],
            },
          ],
        },
      ]),
    };

    prisma.cicloCultivo = {
      findMany: jest.fn().mockResolvedValue([
        {
          idCiclo: 1,
          variedad: 'Tomate Cherry',
          temporada: 'PRIMAVERA_2026',
          estado: EstadoCiclo.ACTIVO,
          costoTotalAcumulado: 1200000,
          costoUnitarioKg: 650,
          totalKgCosechados: 2000,
          nave: { codigoNave: 'N-01', nombre: 'Nave Cherry', superficieM2: 1000 },
          cosechas: [{ kilosNetos: 2000 }],
        },
      ]),
    };

    prisma.cosecha = {
      findMany: jest.fn().mockResolvedValue([
        { kilosNetos: 3500, kilosDisponiblesVenta: 1200 },
      ]),
    };

    prisma.movimientoBodega = {
      findMany: jest.fn().mockResolvedValue([
        { montoTotalMovimiento: 450000 },
      ]),
    };

    prisma.asistenciaJornal = {
      findMany: jest.fn().mockResolvedValue([
        { montoDevengado: 600000 },
      ]),
    };

    prisma.costoIndirecto = {
      findMany: jest.fn().mockResolvedValue([
        { montoTotalProrrateado: 150000 },
      ]),
    };

    prisma.venta = {
      findMany: jest.fn().mockResolvedValue([
        {
          kilosVendidos: 500,
          montoTotalIngreso: 625000,
          costoUnitarioCicloRef: 650,
          margenBrutoOperativo: 300000,
          estadoDespacho: EstadoDespacho.ENTREGADO,
          fechaVenta: new Date('2026-11-15'),
          cosecha: {
            cicloCultivo: { variedad: 'Tomate Cherry' },
          },
        },
      ]),
    };

    prisma.alerta = {
      findMany: jest.fn().mockResolvedValue([
        { tipoAlerta: TipoAlerta.STOCK_MINIMO, estado: EstadoAlerta.ABIERTA },
        { tipoAlerta: TipoAlerta.HELADA, estado: EstadoAlerta.ABIERTA },
      ]),
    };

    prisma.proyeccionCiclo = {
      create: jest.fn().mockResolvedValue({ idProyeccion: 1 }),
    };

    weatherService = {
      obtenerPronostico7Dias: jest.fn().mockResolvedValue({
        pronostico: [
          { fecha: '2026-11-16', tempMinimaC: 1.5, tempMaximaC: 22.0, riesgoHelada: true },
          { fecha: '2026-11-17', tempMinimaC: 4.0, tempMaximaC: 24.0, riesgoHelada: false },
        ],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: ServicioPrisma, useValue: prisma },
        { provide: WeatherService, useValue: weatherService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe calcular KPIs directivos consolidados (Producción, Costos, Comercial, Alertas)', async () => {
    const kpis = await service.obtenerKpisDirectivos();

    // Producción
    expect(kpis.produccion.totalNaves).toBe(1);
    expect(kpis.produccion.navesEnCultivo).toBe(1);
    expect(kpis.produccion.kilosCosechadosTotales).toBe(3500);
    expect(kpis.produccion.kilosDisponiblesVenta).toBe(1200);

    // Costos
    expect(kpis.costos.costoTotalAcumuladoCLP).toBe(1200000);
    expect(kpis.costos.desgloseEstructura.insumosAgricolasCLP).toBe(450000);
    expect(kpis.costos.desgloseEstructura.manoObraDevengadaCLP).toBe(600000);
    expect(kpis.costos.desgloseEstructura.costosIndirectosCLP).toBe(150000);

    // Comercial
    expect(kpis.comercial.totalNotasVenta).toBe(1);
    expect(kpis.comercial.ingresosTotalesCLP).toBe(625000);
    expect(kpis.comercial.margenBrutoTotalCLP).toBe(300000);
    expect(kpis.comercial.margenBrutoPromedioPct).toBe(48);

    // Alertas y Riesgo
    expect(kpis.alertasYRiesgo.alertasStockCriticoAbiertas).toBe(1);
    expect(kpis.alertasYRiesgo.alertasHeladaAbiertas).toBe(1);
    expect(kpis.alertasYRiesgo.diasConRiesgoHeladaProximos7Dias).toBe(1);
    expect(kpis.alertasYRiesgo.alertaHeladaActivaInminente).toBe(true);
  });

  it('debe generar los 5 gráficos en formato Chart.js compatible', async () => {
    const graficos = await service.obtenerGraficosChartJs();

    expect(graficos.rendimientoPorNave.tipo).toBe('bar');
    expect(graficos.rendimientoPorNave.labels).toHaveLength(1);
    expect(graficos.rendimientoPorNave.datasets).toHaveLength(2);

    expect(graficos.evolucionFinanciera.tipo).toBe('bar');
    expect(graficos.evolucionFinanciera.datasets).toHaveLength(3);

    expect(graficos.estructuraCostos.tipo).toBe('doughnut');
    expect(graficos.estructuraCostos.labels).toHaveLength(3);

    expect(graficos.pronosticoClimatico.tipo).toBe('line');
    expect(graficos.pronosticoClimatico.datasets).toHaveLength(3); // Max, Min, Umbral 2°C

    expect(graficos.ventasPorVariedad.tipo).toBe('bar');
    expect(graficos.ventasPorVariedad.datasets).toHaveLength(2); // Kilos, Margen
  });

  it('debe generar proyecciones predictivas asignando riesgo climático ALTO si hay helada', async () => {
    const proyecciones = await service.obtenerProyeccionesCiclos();

    expect(proyecciones).toHaveLength(1);
    expect(proyecciones[0].idCiclo).toBe(1);
    expect(proyecciones[0].rendimientoKgEstimado).toBeGreaterThan(0);
    expect(proyecciones[0].nivelRiesgoClimatico).toBe(NivelRiesgoClimatico.ALTO);
    expect(prisma.proyeccionCiclo.create).toHaveBeenCalledTimes(1);
  });

  it('debe consolidar el Dashboard Ejecutivo completo', async () => {
    const dashboard = await service.obtenerDashboardEjecutivo();

    expect(dashboard.fechaGeneracion).toBeDefined();
    expect(dashboard.kpisDirectivos).toBeDefined();
    expect(dashboard.graficosChartJs).toBeDefined();
    expect(dashboard.proyeccionesPredictivas).toBeDefined();
  });
});

