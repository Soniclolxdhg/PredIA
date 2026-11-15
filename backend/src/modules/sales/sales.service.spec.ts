import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoDespacho, EstadoCiclo, CalidadGrado } from '@prisma/client';
import { SalesService } from './sales.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: {
    cliente: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cosecha: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    venta: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    detalleVenta: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      cliente: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cosecha: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      venta: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      detalleVenta: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // HU08: CATÁLOGO DE CLIENTES
  // ==========================================
  describe('Catálogo de Clientes (HU08)', () => {
    it('debe crear un nuevo cliente con RUT único', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);
      prisma.cliente.create.mockResolvedValue({
        idCliente: 1,
        rutCliente: '76.123.456-7',
        razonSocial: 'Agrícola Los Aromos SpA',
        contactoNombre: 'Carlos Silva',
        telefono: '+56 9 1234 5678',
        email: 'ventas@losaromos.cl',
        direccion: 'Ruta 5 Sur Km 85',
      });

      const resultado = await service.crearCliente({
        rutCliente: '76.123.456-7',
        razonSocial: 'Agrícola Los Aromos SpA',
        contactoNombre: 'Carlos Silva',
        telefono: '+56 9 1234 5678',
        email: 'ventas@losaromos.cl',
        direccion: 'Ruta 5 Sur Km 85',
      });

      expect(resultado.idCliente).toBe(1);
      expect(resultado.rutCliente).toBe('76.123.456-7');
      expect(prisma.cliente.create).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar cliente si el RUT ya existe (ConflictException)', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        idCliente: 2,
        rutCliente: '76.123.456-7',
        razonSocial: 'Cliente Existente',
      });

      await expect(
        service.crearCliente({
          rutCliente: '76.123.456-7',
          razonSocial: 'Supermercado Nuevo',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe listar clientes con conteo de notas de venta asociadas', async () => {
      prisma.cliente.findMany.mockResolvedValue([
        {
          idCliente: 1,
          rutCliente: '76.123.456-7',
          razonSocial: 'Agrícola Los Aromos',
          contactoNombre: 'Carlos',
          telefono: '123',
          email: 'a@b.cl',
          direccion: 'Dir',
          _count: { ventas: 3 },
        },
      ]);

      const clientes = await service.listarClientes('Los Aromos');
      expect(clientes).toHaveLength(1);
      expect(clientes[0].totalNotasVenta).toBe(3);
    });

    it('debe lanzar NotFoundException si el cliente no existe al buscarlo', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(service.obtenerClientePorId(999)).rejects.toThrow(NotFoundException);
    });

    it('debe impedir eliminar un cliente si registra ventas históricas (BadRequestException)', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        idCliente: 1,
        razonSocial: 'Cliente Con Ventas',
      });
      prisma.venta.count.mockResolvedValue(5);

      await expect(service.eliminarCliente(1)).rejects.toThrow(BadRequestException);
      expect(prisma.cliente.delete).not.toHaveBeenCalled();
    });

    it('debe permitir eliminar un cliente si no tiene ventas registradas', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        idCliente: 1,
        razonSocial: 'Cliente Sin Ventas',
      });
      prisma.venta.count.mockResolvedValue(0);
      prisma.cliente.delete.mockResolvedValue({ idCliente: 1 });

      const resultado = await service.eliminarCliente(1);
      expect(resultado.mensaje).toContain('eliminado correctamente');
      expect(prisma.cliente.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // HU10: STOCK DISPONIBLE Y EMISIÓN DE NOTAS DE VENTA
  // ==========================================
  describe('Emisión de Notas de Venta y Margen Bruto (HU10)', () => {
    const cosechaMock = {
      idCosecha: 10,
      idCiclo: 1,
      fechaCosecha: new Date('2026-11-10'),
      calidadGrado: CalidadGrado.PRIMERA,
      kilosNetos: 1500,
      kilosDisponiblesVenta: 1200,
      cicloCultivo: {
        idCiclo: 1,
        variedad: 'Tomate Cherry',
        temporada: 'PRIMAVERA_2026',
        estado: EstadoCiclo.FINALIZADO,
        costoUnitarioKg: 650, // Costo real $/Kg
        costoTotalAcumulado: 650000,
        totalKgCosechados: 1000,
        nave: { idNave: 1, codigoNave: 'N-01', nombre: 'Nave Central' },
      },
    };

    it('debe listar lotes con stock disponible para venta', async () => {
      prisma.cosecha.findMany.mockResolvedValue([cosechaMock]);

      const stock = await service.obtenerStockDisponibleParaVenta();
      expect(stock).toHaveLength(1);
      expect(stock[0].kilosDisponiblesVenta).toBe(1200);
      expect(stock[0].costoReferenciaKg).toBe(650);
      expect(stock[0].esCostoProvisorio).toBe(false);
    });

    it('debe rechazar venta si los kilos solicitados superan el stock disponible (HU10)', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        idCliente: 1,
        razonSocial: 'Cliente Test',
      });
      prisma.cosecha.findUnique.mockResolvedValue(cosechaMock);

      await expect(
        service.emitirNotaVenta(1, {
          idCliente: 1,
          idCosecha: 10,
          kilosVendidos: 1500, // Stock disponible es 1200
          precioUnitarioVenta: 1200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar venta si el cliente no existe', async () => {
      prisma.cliente.findUnique.mockResolvedValue(null);

      await expect(
        service.emitirNotaVenta(1, {
          idCliente: 999,
          idCosecha: 10,
          kilosVendidos: 100,
          precioUnitarioVenta: 1200,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe emitir nota de venta descontando stock y calculando Margen Bruto Operativo', async () => {
      prisma.cliente.findUnique.mockResolvedValue({
        idCliente: 1,
        rutCliente: '76.123.456-7',
        razonSocial: 'Distribuidora Central',
      });
      prisma.cosecha.findUnique.mockResolvedValue(cosechaMock);
      prisma.venta.count.mockResolvedValue(0);

      const ventaCreada = {
        idVenta: 101,
        idCliente: 1,
        idCosecha: 10,
        idUsuarioVendedor: 1,
        numeroNotaVenta: 'NV-2026-0001',
        fechaVenta: new Date('2026-11-15'),
        kilosVendidos: 500,
        precioUnitarioVenta: 1200,
        montoTotalIngreso: 600000, // 500 * 1200
        costoUnitarioCicloRef: 650,
        margenBrutoOperativo: 275000, // 600000 - (500 * 650 = 325000)
        estadoDespacho: EstadoDespacho.PENDIENTE,
      };

      const detalleCreado = {
        idDetalle: 201,
        idVenta: 101,
        idCosecha: 10,
        kilosVendidos: 500,
        precioUnitarioVenta: 1200,
        costoUnitarioRef: 650,
        esCostoProvisorio: false,
        margenBruto: 275000,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          cosecha: {
            update: jest.fn().mockResolvedValue({
              ...cosechaMock,
              kilosDisponiblesVenta: 700, // 1200 - 500
            }),
          },
          venta: {
            create: jest.fn().mockResolvedValue(ventaCreada),
          },
          detalleVenta: {
            create: jest.fn().mockResolvedValue(detalleCreado),
          },
        });
      });

      const resultado = await service.emitirNotaVenta(1, {
        idCliente: 1,
        idCosecha: 10,
        kilosVendidos: 500,
        precioUnitarioVenta: 1200,
      });

      expect(resultado.idVenta).toBe(101);
      expect(resultado.numeroNotaVenta).toBe('NV-2026-0001');
      expect(resultado.desgloseEconomico.montoTotalIngreso).toBe(600000);
      expect(resultado.desgloseEconomico.costoTotalVenta).toBe(325000);
      expect(resultado.desgloseEconomico.margenBrutoOperativo).toBe(275000);
      expect(resultado.desgloseEconomico.porcentajeMargenBruto).toBe(45.83); // 275000 / 600000 * 100
      expect(resultado.stockRemanenteLoteKg).toBe(700);
    });

    it('debe actualizar el estado de despacho de una nota de venta', async () => {
      prisma.venta.findUnique.mockResolvedValue({
        idVenta: 101,
        numeroNotaVenta: 'NV-2026-0001',
        estadoDespacho: EstadoDespacho.PENDIENTE,
      });
      prisma.venta.update.mockResolvedValue({
        idVenta: 101,
        numeroNotaVenta: 'NV-2026-0001',
        estadoDespacho: EstadoDespacho.DESPACHADO,
      });

      const resultado = await service.actualizarEstadoDespacho(101, {
        estadoDespacho: EstadoDespacho.DESPACHADO,
      });

      expect(resultado.nuevoEstadoDespacho).toBe(EstadoDespacho.DESPACHADO);
      expect(resultado.estadoAnterior).toBe(EstadoDespacho.PENDIENTE);
    });

    it('debe calcular métricas consolidadas de ventas y ranking de clientes', async () => {
      prisma.venta.findMany.mockResolvedValue([
        {
          idVenta: 1,
          kilosVendidos: 500,
          montoTotalIngreso: 600000,
          margenBrutoOperativo: 275000,
          estadoDespacho: EstadoDespacho.ENTREGADO,
          cliente: { idCliente: 1, razonSocial: 'Cliente A', rutCliente: '76.1' },
        },
        {
          idVenta: 2,
          kilosVendidos: 300,
          montoTotalIngreso: 360000,
          margenBrutoOperativo: 150000,
          estadoDespacho: EstadoDespacho.PENDIENTE,
          cliente: { idCliente: 2, razonSocial: 'Cliente B', rutCliente: '77.2' },
        },
      ]);

      const metricas = await service.obtenerMetricasVentas();
      expect(metricas.resumenGlobal.totalNotasVenta).toBe(2);
      expect(metricas.resumenGlobal.totalKilosVendidos).toBe(800);
      expect(metricas.resumenGlobal.totalIngresosCLP).toBe(960000);
      expect(metricas.resumenGlobal.totalMargenBrutoCLP).toBe(425000);
      expect(metricas.despachoPorEstado.ENTREGADO).toBe(1);
      expect(metricas.despachoPorEstado.PENDIENTE).toBe(1);
      expect(metricas.topClientes).toHaveLength(2);
      expect(metricas.topClientes[0].razonSocial).toBe('Cliente A');
    });
  });
});
