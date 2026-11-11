import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CategoriaInsumo,
  TipoMovimientoBodega,
  TipoAlerta,
  EstadoAlerta,
} from '@prisma/client';
import { InventoryService } from './inventory.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    insumo: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    movimientoBodega: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    alerta: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    laborAgricola: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      insumo: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      movimientoBodega: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      alerta: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      laborAgricola: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Catálogo de Insumos', () => {
    it('debe crear un insumo e inferir esMaterialVegetal en SEMILLA', async () => {
      prisma.insumo.findUnique.mockResolvedValue(null);
      prisma.insumo.create.mockResolvedValue({
        idInsumo: 1,
        codigoInsumo: 'SEM-001',
        nombre: 'Semilla Tomate Calafate',
        categoria: CategoriaInsumo.SEMILLA,
        unidadMedida: 'UNIDADES',
        stockMinimoAlerta: 1000,
        stockActual: 0,
        costoUnitarioPromedio: 0,
        esMaterialVegetal: true,
      });

      const resultado = await service.crearInsumo({
        codigoInsumo: 'SEM-001',
        nombre: 'Semilla Tomate Calafate',
        categoria: CategoriaInsumo.SEMILLA,
        unidadMedida: 'UNIDADES',
        stockMinimoAlerta: 1000,
      });

      expect(resultado.codigoInsumo).toBe('SEM-001');
      expect(resultado.esMaterialVegetal).toBe(true);
      expect(prisma.insumo.create).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el código de insumo ya existe', async () => {
      prisma.insumo.findUnique.mockResolvedValue({ idInsumo: 1, codigoInsumo: 'FERT-01' });

      await expect(
        service.crearInsumo({
          codigoInsumo: 'FERT-01',
          nombre: 'Fertilizante NPK',
          categoria: CategoriaInsumo.FERTILIZANTE,
          unidadMedida: 'KG',
          stockMinimoAlerta: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Kardex y Mermas (HU04)', () => {
    it('debe registrar ENTRADA_COMPRA con cálculo de merma y actualizar costo promedio ponderado', async () => {
      const insumoInicial = {
        idInsumo: 1,
        codigoInsumo: 'SEM-001',
        nombre: 'Semilla Tomate',
        stockActual: 1000,
        costoUnitarioPromedio: 50,
        stockMinimoAlerta: 500,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          insumo: {
            findUnique: jest.fn().mockResolvedValue(insumoInicial),
            update: jest.fn().mockResolvedValue({}),
          },
          alerta: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          movimientoBodega: {
            create: jest.fn().mockResolvedValue({
              idMovimiento: 1,
              idInsumo: 1,
              tipoMovimiento: TipoMovimientoBodega.ENTRADA_COMPRA,
              cantidadNominal: 1000,
              porcentajeMerma: 10,
              cantidadNeta: 900,
              costoUnitarioCompra: 60,
              montoTotalMovimiento: 60000,
            }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.registrarMovimiento(1, {
        idInsumo: 1,
        tipoMovimiento: TipoMovimientoBodega.ENTRADA_COMPRA,
        cantidadNominal: 1000,
        porcentajeMerma: 10, // 10% merma -> 900 unidades netas
        costoUnitarioCompra: 60,
      });

      // Stock anterior (1000 * 50 = 50.000) + Nueva compra (1000 * 60 = 60.000) = 110.000
      // Nuevo stock neto = 1000 + 900 = 1900
      // Nuevo costo promedio = 110.000 / 1900 = 57.89
      expect(resultado.stockResultante).toBe(1900);
      expect(resultado.costoPromedioResultante).toBe(57.89);
      expect(resultado.movimiento.cantidadNeta).toBe(900);
    });

    it('debe rechazar SALIDA_LABOR si el stock es insuficiente', async () => {
      const insumoConPocoStock = {
        idInsumo: 2,
        codigoInsumo: 'FERT-01',
        nombre: 'Urea Fertilizante',
        unidadMedida: 'KG',
        stockActual: 20,
        costoUnitarioPromedio: 1200,
        stockMinimoAlerta: 50,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          insumo: {
            findUnique: jest.fn().mockResolvedValue(insumoConPocoStock),
          },
        };
        return callback(tx);
      });

      await expect(
        service.registrarMovimiento(1, {
          idInsumo: 2,
          tipoMovimiento: TipoMovimientoBodega.SALIDA_LABOR,
          cantidadNominal: 30, // Pide 30 pero solo hay 20
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Alertas Automáticas de Stock Crítico (HU05)', () => {
    it('debe disparar automáticamente una alerta de STOCK_MINIMO si el stock cae por debajo del umbral', async () => {
      const insumo = {
        idInsumo: 3,
        codigoInsumo: 'DESINF-01',
        nombre: 'Desinfectante Suelo',
        unidadMedida: 'LITROS',
        stockActual: 60,
        costoUnitarioPromedio: 5000,
        stockMinimoAlerta: 50,
      };

      let alertaCreada = false;

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          insumo: {
            findUnique: jest.fn().mockResolvedValue(insumo),
            update: jest.fn().mockResolvedValue({}),
          },
          alerta: {
            findFirst: jest.fn().mockResolvedValue(null), // No existe alerta previa abierta
            create: jest.fn().mockImplementation(() => {
              alertaCreada = true;
              return { idAlerta: 1, tipoAlerta: TipoAlerta.STOCK_MINIMO };
            }),
          },
          movimientoBodega: {
            create: jest.fn().mockResolvedValue({
              idMovimiento: 5,
              cantidadNeta: 20,
            }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.registrarMovimiento(1, {
        idInsumo: 3,
        tipoMovimiento: TipoMovimientoBodega.SALIDA_LABOR,
        cantidadNominal: 20, // 60 - 20 = 40 (por debajo de los 50 mínimos)
      });

      expect(resultado.stockResultante).toBe(40);
      expect(alertaCreada).toBe(true);
    });

    it('debe marcar una alerta como ATENDIDA', async () => {
      prisma.alerta.findUnique.mockResolvedValue({
        idAlerta: 10,
        estado: EstadoAlerta.ABIERTA,
      });

      prisma.alerta.update.mockResolvedValue({
        idAlerta: 10,
        estado: EstadoAlerta.ATENDIDA,
      });

      const resultado = await service.atenderAlerta(10);
      expect(resultado.estado).toBe(EstadoAlerta.ATENDIDA);
    });
  });
});

