import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EstadoCiclo } from '@prisma/client';
import { CostingEngineService } from './costing-engine.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('CostingEngineService (HU09 / CU09)', () => {
  let service: CostingEngineService;
  let prisma: {
    cicloCultivo: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    asistenciaJornal: {
      findMany: jest.Mock;
    };
    movimientoBodega: {
      findMany: jest.Mock;
    };
    costoIndirecto: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      cicloCultivo: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      asistenciaJornal: {
        findMany: jest.fn(),
      },
      movimientoBodega: {
        findMany: jest.fn(),
      },
      costoIndirecto: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostingEngineService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<CostingEngineService>(CostingEngineService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe consolidar la estructura de costos y calcular el valor real $/Kg', async () => {
    const cicloSimulado = {
      idCiclo: 1,
      temporada: 'PRIMAVERA_2026',
      variedad: 'Tomate Calafate',
      estado: EstadoCiclo.ACTIVO,
      totalKgCosechados: 2000,
      costoTotalAcumulado: 0,
      costoUnitarioKg: 0,
      nave: { codigoNave: 'NAV-01', nombre: 'Nave Norte', superficieM2: 500 },
    };

    prisma.cicloCultivo.findUnique.mockResolvedValue(cicloSimulado);

    // Mano de obra: $400.000 (80 hrs)
    prisma.asistenciaJornal.findMany.mockResolvedValue([
      { montoDevengado: 250000, horasTrabajadas: 50 },
      { montoDevengado: 150000, horasTrabajadas: 30 },
    ]);

    // Insumos directos: $350.000
    prisma.movimientoBodega.findMany.mockResolvedValue([
      { montoTotalMovimiento: 200000 },
      { montoTotalMovimiento: 150000 },
    ]);

    // Costos indirectos prorrateados: $250.000
    prisma.costoIndirecto.findMany.mockResolvedValue([
      { montoTotalProrrateado: 150000, tipoGasto: 'ELECTRICIDAD_BOMBEO' },
      { montoTotalProrrateado: 100000, tipoGasto: 'AGUA_RIEGO' },
    ]);

    const resultado = await service.obtenerEstructuraCostosCiclo(1);

    // Total = 400.000 + 350.000 + 250.000 = $1.000.000
    expect(resultado.consolidadoCostos.costoTotalConsolidado).toBe(1000000);
    expect(resultado.desglose.manoDeObra.total).toBe(400000);
    expect(resultado.desglose.insumos.total).toBe(350000);
    expect(resultado.desglose.costosIndirectos.total).toBe(250000);

    // Costo unitario: 1.000.000 / 2.000 Kg = $500 / Kg
    expect(resultado.produccion.costoUnitarioRealKg).toBe(500);

    // Porcentajes
    expect(resultado.desglose.manoDeObra.participacionPorcentaje).toBe(40);
    expect(resultado.desglose.insumos.participacionPorcentaje).toBe(35);
    expect(resultado.desglose.costosIndirectos.participacionPorcentaje).toBe(25);
  });

  it('debe lanzar NotFoundException si el ciclo no existe', async () => {
    prisma.cicloCultivo.findUnique.mockResolvedValue(null);

    await expect(service.obtenerEstructuraCostosCiclo(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
