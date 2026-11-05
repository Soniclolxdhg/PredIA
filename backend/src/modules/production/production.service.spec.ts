import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoCiclo, EstadoNave, CalidadGrado, TipoLabor } from '@prisma/client';
import { ProductionService } from './production.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('ProductionService', () => {
  let service: ProductionService;
  let prisma: {
    nave: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    cicloCultivo: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    laborAgricola: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    cosecha: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      nave: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cicloCultivo: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      laborAgricola: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      cosecha: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductionService>(ProductionService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Naves (HU01)', () => {
    it('debe crear una nave correctamente', async () => {
      prisma.nave.findUnique.mockResolvedValue(null);
      prisma.nave.create.mockResolvedValue({
        idNave: 1,
        codigoNave: 'NAV-01',
        nombre: 'Nave Norte Tomate',
        superficieM2: 500,
        estado: EstadoNave.DISPONIBLE,
      });

      const resultado = await service.crearNave({
        codigoNave: 'NAV-01',
        nombre: 'Nave Norte Tomate',
        superficieM2: 500,
      });

      expect(resultado.codigoNave).toBe('NAV-01');
      expect(prisma.nave.create).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el código de nave ya existe', async () => {
      prisma.nave.findUnique.mockResolvedValue({ idNave: 1, codigoNave: 'NAV-01' });

      await expect(
        service.crearNave({
          codigoNave: 'NAV-01',
          nombre: 'Otra Nave',
          superficieM2: 400,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Ciclos de Cultivo (HU01 - Validación de Colisión Temporal)', () => {
    it('debe rechazar la apertura de ciclo si la nave ya tiene un ciclo activo (evitar solapamientos)', async () => {
      prisma.nave.findUnique.mockResolvedValue({
        idNave: 1,
        codigoNave: 'NAV-01',
        estado: EstadoNave.EN_CULTIVO,
        ciclosCultivo: [{ idCiclo: 99, estado: EstadoCiclo.ACTIVO }],
      });

      await expect(
        service.crearCiclo({
          idNave: 1,
          temporada: 'PRIMAVERA_2026',
          variedad: 'Tomate Calafate',
          fechaInicio: '2026-09-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe abrir ciclo y actualizar nave a EN_CULTIVO mediante transacción', async () => {
      prisma.nave.findUnique.mockResolvedValue({
        idNave: 1,
        codigoNave: 'NAV-01',
        estado: EstadoNave.DISPONIBLE,
        ciclosCultivo: [],
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cicloCultivo: {
            create: jest.fn().mockResolvedValue({
              idCiclo: 10,
              idNave: 1,
              temporada: 'PRIMAVERA_2026',
              estado: EstadoCiclo.ACTIVO,
            }),
          },
          nave: {
            update: jest.fn().mockResolvedValue({ idNave: 1, estado: EstadoNave.EN_CULTIVO }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.crearCiclo({
        idNave: 1,
        temporada: 'PRIMAVERA_2026',
        variedad: 'Tomate Calafate',
        fechaInicio: '2026-09-01',
      });

      expect(resultado.idCiclo).toBe(10);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe cerrar el ciclo, calcular el costo unitario por Kg y liberar la nave a DISPONIBLE', async () => {
      prisma.cicloCultivo.findUnique.mockResolvedValue({
        idCiclo: 10,
        idNave: 1,
        estado: EstadoCiclo.ACTIVO,
        totalKgCosechados: 1000,
        costoTotalAcumulado: 500000,
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cicloCultivo: {
            update: jest.fn().mockResolvedValue({
              idCiclo: 10,
              estado: EstadoCiclo.FINALIZADO,
              costoUnitarioKg: 500,
            }),
          },
          nave: {
            update: jest.fn().mockResolvedValue({ idNave: 1, estado: EstadoNave.DISPONIBLE }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.cerrarCiclo(10, {});
      expect(resultado.estado).toBe(EstadoCiclo.FINALIZADO);
      expect(resultado.costoUnitarioKg).toBe(500);
    });
  });

  describe('Labores Agrícolas en Terreno (HU02)', () => {
    it('debe registrar una labor cultural asociada a un ciclo activo', async () => {
      prisma.cicloCultivo.findUnique.mockResolvedValue({
        idCiclo: 10,
        estado: EstadoCiclo.ACTIVO,
      });

      prisma.laborAgricola.create.mockResolvedValue({
        idLabor: 1,
        idCiclo: 10,
        idUsuarioResponsable: 5,
        tipoLabor: TipoLabor.FERTILIZACION,
        horasDedicadas: 4,
      });

      const resultado = await service.registrarLabor(5, {
        idCiclo: 10,
        tipoLabor: TipoLabor.FERTILIZACION,
        fechaEjecucion: '2026-09-15',
        horasDedicadas: 4,
        observacionesTecnicas: 'Aplicación NPK foliar preventiva',
      });

      expect(resultado.tipoLabor).toBe(TipoLabor.FERTILIZACION);
      expect(prisma.laborAgricola.create).toHaveBeenCalled();
    });

    it('debe rechazar registro de labor si el ciclo ya está finalizado', async () => {
      prisma.cicloCultivo.findUnique.mockResolvedValue({
        idCiclo: 10,
        estado: EstadoCiclo.FINALIZADO,
      });

      await expect(
        service.registrarLabor(5, {
          idCiclo: 10,
          tipoLabor: TipoLabor.RIEGO,
          fechaEjecucion: '2026-10-01',
          horasDedicadas: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Pesaje de Cosecha en Báscula (HU03)', () => {
    it('debe registrar pesaje en báscula e incrementar los kilos cosechados del ciclo', async () => {
      prisma.cicloCultivo.findUnique.mockResolvedValue({
        idCiclo: 10,
        estado: EstadoCiclo.ACTIVO,
      });

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cosecha: {
            create: jest.fn().mockResolvedValue({
              idCosecha: 1,
              idCiclo: 10,
              kilosNetos: 250,
              calidadGrado: CalidadGrado.PRIMERA,
              kilosDisponiblesVenta: 250,
            }),
          },
          cicloCultivo: {
            update: jest.fn().mockResolvedValue({ idCiclo: 10, totalKgCosechados: 250 }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.registrarCosecha(5, {
        idCiclo: 10,
        fechaCosecha: '2026-11-01',
        kilosNetos: 250,
        calidadGrado: CalidadGrado.PRIMERA,
      });

      expect(resultado.kilosNetos).toBe(250);
      expect(resultado.kilosDisponiblesVenta).toBe(250);
    });
  });
});
