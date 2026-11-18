import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('CatalogsService', () => {
  let service: CatalogsService;
  let prisma: {
    catalogoVariedad: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cicloCultivo: {
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      catalogoVariedad: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cicloCultivo: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogsService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<CatalogsService>(CatalogsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una nueva variedad con nombre único', async () => {
    prisma.catalogoVariedad.findFirst.mockResolvedValue(null);
    prisma.catalogoVariedad.create.mockResolvedValue({
      idVariedad: 1,
      nombre: 'Tomate Limachino',
      especie: 'Tomate',
      descripcion: 'Variedad tradicional',
      activo: true,
      fechaCreacion: new Date(),
    });

    const resultado = await service.crearVariedad({
      nombre: 'Tomate Limachino',
      especie: 'Tomate',
      descripcion: 'Variedad tradicional',
    });

    expect(resultado.idVariedad).toBe(1);
    expect(resultado.nombre).toBe('Tomate Limachino');
    expect(prisma.catalogoVariedad.create).toHaveBeenCalledTimes(1);
  });

  it('debe rechazar variedad duplicada (ConflictException)', async () => {
    prisma.catalogoVariedad.findFirst.mockResolvedValue({
      idVariedad: 1,
      nombre: 'Tomate Cherry',
    });

    await expect(
      service.crearVariedad({ nombre: 'tomate cherry' }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe lanzar NotFoundException si la variedad no existe al buscarla', async () => {
    prisma.catalogoVariedad.findUnique.mockResolvedValue(null);

    await expect(service.obtenerVariedadPorId(99)).rejects.toThrow(NotFoundException);
  });

  it('debe desactivar en lugar de eliminar si la variedad tiene ciclos históricos', async () => {
    prisma.catalogoVariedad.findUnique.mockResolvedValue({
      idVariedad: 1,
      nombre: 'Tomate Larga Vida',
      activo: true,
    });
    prisma.cicloCultivo.count.mockResolvedValue(2);
    prisma.catalogoVariedad.update.mockResolvedValue({
      idVariedad: 1,
      nombre: 'Tomate Larga Vida',
      activo: false,
    });

    const res = await service.eliminarVariedad(1);
    expect(res.eliminacionFisica).toBe(false);
    expect(prisma.catalogoVariedad.delete).not.toHaveBeenCalled();
    expect(prisma.catalogoVariedad.update).toHaveBeenCalledTimes(1);
  });

  it('debe eliminar físicamente si la variedad no tiene ciclos asociados', async () => {
    prisma.catalogoVariedad.findUnique.mockResolvedValue({
      idVariedad: 2,
      nombre: 'Variedad Prueba',
      activo: true,
    });
    prisma.cicloCultivo.count.mockResolvedValue(0);
    prisma.catalogoVariedad.delete.mockResolvedValue({ idVariedad: 2 });

    const res = await service.eliminarVariedad(2);
    expect(res.eliminacionFisica).toBe(true);
    expect(prisma.catalogoVariedad.delete).toHaveBeenCalledTimes(1);
  });
});
