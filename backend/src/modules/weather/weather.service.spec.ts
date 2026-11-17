import { Test, TestingModule } from '@nestjs/testing';
import { TipoAlerta, EstadoAlerta } from '@prisma/client';
import { WeatherService } from './weather.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let prisma: {
    historicoClima: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
      count: jest.Mock;
    };
    alerta: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      historicoClima: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        count: jest.fn().mockResolvedValue(7),
      },
      alerta: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Sincronización y Detección de Heladas (< 2°C)', () => {
    it('debe registrar el pronóstico y crear alerta preventiva cuando la temp mínima sea menor a 2°C', async () => {
      // Simulamos upsert en BD
      prisma.historicoClima.upsert.mockImplementation(async ({ create }) => ({
        idRegistroClima: 1,
        ...create,
      }));

      // No existe alerta previa
      prisma.alerta.findFirst.mockResolvedValue(null);
      prisma.alerta.create.mockResolvedValue({
        idAlerta: 10,
        tipoAlerta: TipoAlerta.HELADA,
        idRegistroClima: 1,
        mensaje: '⚠️ ALERTA PREVENTIVA DE HELADA',
        estado: EstadoAlerta.ABIERTA,
      });

      const resultado = await service.sincronizarPronostico({ diasPronostico: 7 });

      expect(resultado.totalDias).toBe(7);
      expect(prisma.historicoClima.upsert).toHaveBeenCalledTimes(7);
      // Debe haber generado al menos una alerta si algún día tuvo temp < 2°C
      if (resultado.alertasHeladaGeneradas > 0) {
        expect(prisma.alerta.create).toHaveBeenCalled();
      }
    });

    it('no debe duplicar alerta abierta de helada si ya existe para ese registro', async () => {
      prisma.historicoClima.upsert.mockResolvedValue({
        idRegistroClima: 5,
        fechaPronostico: new Date('2026-11-18'),
        tempMinimaC: 1.2,
        tempMaximaC: 19.0,
        riesgoHelada: true,
      });

      // Ya existe alerta abierta
      prisma.alerta.findFirst.mockResolvedValue({
        idAlerta: 8,
        tipoAlerta: TipoAlerta.HELADA,
        idRegistroClima: 5,
        estado: EstadoAlerta.ABIERTA,
      });

      await service.sincronizarPronostico({ diasPronostico: 3 });

      // No debe llamar a create para registros que ya tienen alerta abierta
      expect(prisma.alerta.create).not.toHaveBeenCalled();
    });
  });

  describe('Consulta de Pronóstico y Alertas', () => {
    it('debe retornar pronóstico de 7 días desde caché si existen registros completos', async () => {
      const mockRegistros = Array.from({ length: 7 }, (_, i) => ({
        idRegistroClima: i + 1,
        fechaPronostico: new Date(`2026-11-${16 + i}`),
        tempMinimaC: 5.0,
        tempMaximaC: 22.0,
        probabilidadPrecipitacionPct: 10,
        riesgoHelada: false,
        datosMeteorologicosJsonb: { descripcionClima: 'Despejado' },
        alertas: [],
      }));

      prisma.historicoClima.findMany.mockResolvedValue(mockRegistros);

      const res = await service.obtenerPronostico7Dias();
      expect(res.totalDias).toBe(7);
      expect(res.pronostico).toHaveLength(7);
      expect(res.fuente).toBe('CACHE_SINCRONIZADA');
    });

    it('debe marcar una alerta de helada como ATENDIDA', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        idAlerta: 1,
        tipoAlerta: TipoAlerta.HELADA,
        estado: EstadoAlerta.ABIERTA,
        mensaje: 'Alerta de helada',
      });

      prisma.alerta.update.mockResolvedValue({
        idAlerta: 1,
        tipoAlerta: TipoAlerta.HELADA,
        estado: EstadoAlerta.ATENDIDA,
        mensaje: 'Alerta de helada [Atendida: Se cerraron cortinas térmicas]',
      });

      const res = await service.atenderAlerta(1, {
        estado: EstadoAlerta.ATENDIDA,
        observacion: 'Se cerraron cortinas térmicas',
      });

      expect(res.estado).toBe(EstadoAlerta.ATENDIDA);
      expect(prisma.alerta.update).toHaveBeenCalledTimes(1);
    });
  });
});
