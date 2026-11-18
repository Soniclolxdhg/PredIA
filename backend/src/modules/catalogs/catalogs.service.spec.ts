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
    catalogoEstructura: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    catalogoUnidad: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    cicloCultivo: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    nave: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    insumo: {
      count: jest.Mock;
      findMany: jest.Mock;
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
      catalogoEstructura: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      catalogoUnidad: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      cicloCultivo: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      nave: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      insumo: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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

  // ==========================================
  // 1. VARIEDADES
  // ==========================================
  describe('Catálogo de Variedades', () => {
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
    });
  });

  // ==========================================
  // 2. TIPOS DE ESTRUCTURA
  // ==========================================
  describe('Catálogo de Estructuras', () => {
    it('debe crear un tipo de estructura autogenerando código EST-XX si se omite', async () => {
      prisma.catalogoEstructura.count.mockResolvedValue(5);
      prisma.catalogoEstructura.findFirst.mockResolvedValue(null);
      prisma.catalogoEstructura.findUnique.mockResolvedValue(null);
      prisma.catalogoEstructura.create.mockResolvedValue({
        idEstructura: 6,
        codigo: 'EST-06',
        nombre: 'Macrotúnel Reforzado',
        descripcion: 'Acero galvanizado',
        activo: true,
        fechaCreacion: new Date(),
      });

      const res = await service.crearEstructura({
        nombre: 'Macrotúnel Reforzado',
        descripcion: 'Acero galvanizado',
      });

      expect(res.codigo).toBe('EST-06');
      expect(res.navesEnUso).toBe(0);
    });

    it('debe listar estructuras calculando navesEnUso', async () => {
      prisma.catalogoEstructura.findMany.mockResolvedValue([
        { idEstructura: 1, codigo: 'EST-01', nombre: 'Multitúnel Metal', activo: true },
      ]);
      prisma.nave.findMany.mockResolvedValue([
        { tipoEstructura: 'Multitúnel Metal' },
        { tipoEstructura: 'multitúnel metal' },
      ]);

      const lista = await service.listarEstructuras();
      expect(lista[0].navesEnUso).toBe(2);
    });

    it('debe desactivar estructura si tiene naves asociadas', async () => {
      prisma.catalogoEstructura.findUnique.mockResolvedValue({
        idEstructura: 1,
        codigo: 'EST-01',
        nombre: 'Multitúnel Metal',
        activo: true,
      });
      prisma.nave.count.mockResolvedValue(2);
      prisma.catalogoEstructura.update.mockResolvedValue({
        idEstructura: 1,
        activo: false,
      });

      const res = await service.eliminarEstructura(1);
      expect(res.eliminacionFisica).toBe(false);
      expect(prisma.catalogoEstructura.delete).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 3. UNIDADES DE MEDIDA
  // ==========================================
  describe('Catálogo de Unidades de Medida', () => {
    it('debe crear unidad autogenerando código MED-XX si se omite', async () => {
      prisma.catalogoUnidad.count.mockResolvedValue(7);
      prisma.catalogoUnidad.findFirst.mockResolvedValue(null);
      prisma.catalogoUnidad.create.mockResolvedValue({
        idUnidad: 8,
        codigo: 'MED-08',
        nombre: 'Toneladas',
        simbolo: 'Ton',
        magnitud: 'MASA',
        activo: true,
        fechaCreacion: new Date(),
      });

      const res = await service.crearUnidad({
        nombre: 'Toneladas',
        simbolo: 'Ton',
        magnitud: 'masa',
      });

      expect(res.codigo).toBe('MED-08');
      expect(res.magnitud).toBe('MASA');
      expect(res.insumosEnUso).toBe(0);
    });

    it('debe listar unidades calculando insumosEnUso', async () => {
      prisma.catalogoUnidad.findMany.mockResolvedValue([
        { idUnidad: 1, codigo: 'MED-01', nombre: 'Kilogramos', simbolo: 'Kg', magnitud: 'MASA', activo: true },
      ]);
      prisma.insumo.findMany.mockResolvedValue([
        { unidadMedida: 'Kg' },
        { unidadMedida: 'kilogramos' },
      ]);

      const lista = await service.listarUnidades();
      expect(lista[0].insumosEnUso).toBe(2);
    });

    it('debe rechazar unidad con símbolo o nombre duplicado', async () => {
      prisma.catalogoUnidad.count.mockResolvedValue(7);
      prisma.catalogoUnidad.findFirst.mockResolvedValue({
        idUnidad: 1,
        codigo: 'MED-01',
        nombre: 'Kilogramos',
        simbolo: 'Kg',
      });

      await expect(
        service.crearUnidad({ nombre: 'Kilo', simbolo: 'kg', magnitud: 'MASA' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
