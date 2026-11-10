import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoCiclo, EstadoNave } from '@prisma/client';
import { ProductionService } from './production.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('ProductionService', () => {
  let service: ProductionService;
  let prisma: {
    nave: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
    };
    cicloCultivo: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    insumo: {
      count: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      nave: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      cicloCultivo: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      insumo: {
        count: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
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

  describe('obtenerNaves', () => {
    it('debe retornar la lista de naves ordenada por idNave', async () => {
      const mockNaves = [
        { idNave: 1, codigoNave: 'NAV-01', nombre: 'Nave 1', estado: EstadoNave.DISPONIBLE },
      ];
      prisma.nave.findMany.mockResolvedValue(mockNaves);

      const resultado = await service.obtenerNaves();
      expect(resultado).toEqual(mockNaves);
      expect(prisma.nave.findMany).toHaveBeenCalledWith({
        orderBy: { idNave: 'asc' },
        include: {
          ciclosCultivo: {
            where: { estado: EstadoCiclo.ACTIVO },
            take: 1,
          },
        },
      });
    });
  });

  describe('crearCiclo', () => {
    it('debe lanzar NotFoundException si la nave no existe', async () => {
      prisma.nave.findUnique.mockResolvedValue(null);

      await expect(
        service.crearCiclo({
          idNave: 99,
          temporada: 'PRIMAVERA_2026',
          variedad: 'Tomate Larga Vida',
          fechaInicio: '2026-09-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la nave ya tiene un ciclo ACTIVO (Regla HU01)', async () => {
      prisma.nave.findUnique.mockResolvedValue({
        idNave: 1,
        codigoNave: 'NAV-01',
        nombre: 'Nave 1',
      });
      prisma.cicloCultivo.findFirst.mockResolvedValue({
        idCiclo: 5,
        variedad: 'Tomate Larga Vida',
        estado: EstadoCiclo.ACTIVO,
      });

      await expect(
        service.crearCiclo({
          idNave: 1,
          temporada: 'PRIMAVERA_2026',
          variedad: 'Pimiento',
          fechaInicio: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear el ciclo y actualizar el estado de la nave a EN_CULTIVO si la nave está disponible', async () => {
      prisma.nave.findUnique.mockResolvedValue({
        idNave: 1,
        codigoNave: 'NAV-01',
        nombre: 'Nave 1',
        estado: EstadoNave.DISPONIBLE,
      });
      prisma.cicloCultivo.findFirst.mockResolvedValue(null);
      prisma.cicloCultivo.create.mockResolvedValue({
        idCiclo: 10,
        idNave: 1,
        temporada: 'PRIMAVERA_2026',
        variedad: 'Tomate Larga Vida',
        estado: EstadoCiclo.ACTIVO,
      });
      prisma.nave.update.mockResolvedValue({
        idNave: 1,
        estado: EstadoNave.EN_CULTIVO,
      });

      const resultado = await service.crearCiclo({
        idNave: 1,
        temporada: 'PRIMAVERA_2026',
        variedad: 'Tomate Larga Vida',
        fechaInicio: '2026-09-01',
      });

      expect(resultado).toBeDefined();
      expect(prisma.nave.update).toHaveBeenCalledWith({
        where: { idNave: 1 },
        data: { estado: EstadoNave.EN_CULTIVO },
      });
    });
  });

  describe('sembrarNavesBase', () => {
    it('debe sembrar las 4 naves si la tabla naves está vacía', async () => {
      prisma.nave.count.mockResolvedValue(0);
      prisma.insumo.count.mockResolvedValue(0);
      prisma.nave.createMany.mockResolvedValue({ count: 4 });
      prisma.insumo.createMany.mockResolvedValue({ count: 2 });
      prisma.nave.findMany.mockResolvedValue([
        { idNave: 1, codigoNave: 'NAV-01' },
        { idNave: 2, codigoNave: 'NAV-02' },
        { idNave: 3, codigoNave: 'NAV-03' },
        { idNave: 4, codigoNave: 'NAV-04' },
      ]);

      const res = await service.sembrarNavesBase();
      expect(res.sembradas).toBe(4);
      expect(prisma.nave.createMany).toHaveBeenCalled();
    });
  });
});
