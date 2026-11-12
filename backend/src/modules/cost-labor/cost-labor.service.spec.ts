import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CargoTrabajador, EstadoCiclo, EstadoPago, ModalidadPago } from '@prisma/client';
import { CostLaborService } from './cost-labor.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

describe('CostLaborService', () => {
  let service: CostLaborService;
  let prisma: {
    trabajador: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    asistenciaJornal: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    costoIndirecto: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    cicloCultivo: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      trabajador: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      asistenciaJornal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      costoIndirecto: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      cicloCultivo: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostLaborService,
        { provide: ServicioPrisma, useValue: prisma },
      ],
    }).compile();

    service = module.get<CostLaborService>(CostLaborService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Nómina de Trabajadores', () => {
    it('debe registrar un trabajador con su modalidad de pago', async () => {
      prisma.trabajador.findUnique.mockResolvedValue(null);
      prisma.trabajador.create.mockResolvedValue({
        idTrabajador: 1,
        rut: '12.345.678-9',
        nombres: 'Juan',
        apellidos: 'Pérez',
        cargo: CargoTrabajador.OPERARIO_CAMPO,
        modalidadPago: ModalidadPago.DIARIO,
        tarifaBase: 35000,
        activo: true,
      });

      const resultado = await service.crearTrabajador({
        rut: '12.345.678-9',
        nombres: 'Juan',
        apellidos: 'Pérez',
        cargo: CargoTrabajador.OPERARIO_CAMPO,
        modalidadPago: ModalidadPago.DIARIO,
        tarifaBase: 35000,
      });

      expect(resultado.idTrabajador).toBe(1);
      expect(resultado.tarifaBase).toBe(35000);
      expect(prisma.trabajador.create).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el RUT ya existe', async () => {
      prisma.trabajador.findUnique.mockResolvedValue({ idTrabajador: 1, rut: '12.345.678-9' });

      await expect(
        service.crearTrabajador({
          rut: '12.345.678-9',
          nombres: 'Otro',
          apellidos: 'Trabajador',
          cargo: CargoTrabajador.COSECHADOR,
          modalidadPago: ModalidadPago.DIARIO,
          tarifaBase: 30000,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Asistencias y Jornales Devengados (HU06 / CU07)', () => {
    it('debe calcular el monto devengado e imputar el costo al ciclo activo', async () => {
      const trabajador = {
        idTrabajador: 1,
        nombres: 'Pedro',
        apellidos: 'González',
        modalidadPago: ModalidadPago.DIARIO,
        tarifaBase: 32000, // 32.000 / 8 hrs = 4.000 $/hr
        activo: true,
      };

      const ciclo = {
        idCiclo: 5,
        estado: EstadoCiclo.ACTIVO,
      };

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          trabajador: { findUnique: jest.fn().mockResolvedValue(trabajador) },
          cicloCultivo: {
            findUnique: jest.fn().mockResolvedValue(ciclo),
            update: jest.fn().mockResolvedValue({}),
          },
          asistenciaJornal: {
            create: jest.fn().mockResolvedValue({
              idAsistencia: 10,
              idTrabajador: 1,
              idCiclo: 5,
              horasTrabajadas: 8,
              valorHoraAplicado: 4000,
              montoDevengado: 32000,
              estadoPago: EstadoPago.PENDIENTE,
            }),
          },
        };
        return callback(tx);
      });

      const resultado = await service.registrarAsistencia({
        idTrabajador: 1,
        idCiclo: 5,
        fechaJornada: '2026-11-10',
        horasTrabajadas: 8,
      });

      expect(resultado.montoDevengadoImputado).toBe(32000);
      expect(resultado.asistencia.montoDevengado).toBe(32000);
    });

    it('debe rechazar asistencia si el trabajador está inactivo', async () => {
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          trabajador: {
            findUnique: jest.fn().mockResolvedValue({
              idTrabajador: 2,
              activo: false,
            }),
          },
        };
        return callback(tx);
      });

      await expect(
        service.registrarAsistencia({
          idTrabajador: 2,
          idCiclo: 5,
          fechaJornada: '2026-11-10',
          horasTrabajadas: 8,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Prorrateo de Costos Indirectos (HU07 / CU08)', () => {
    it('debe prorratear equitativamente un gasto entre ciclos activos', async () => {
      const ciclosActivos = [
        { idCiclo: 1, nave: { codigoNave: 'NAV-01', superficieM2: 500 } },
        { idCiclo: 2, nave: { codigoNave: 'NAV-02', superficieM2: 500 } },
      ];

      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cicloCultivo: {
            findMany: jest.fn().mockResolvedValue(ciclosActivos),
            update: jest.fn().mockResolvedValue({}),
          },
          costoIndirecto: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const resultado = await service.prorratearGastoEntreCiclosActivos({
        tipoGasto: 'ELECTRICIDAD_BOMBEO',
        fechaImputacion: '2026-11-01',
        montoTotalFactura: 100000,
        criterio: 'EQUITATIVO',
      });

      expect(resultado.distribucion).toHaveLength(2);
      expect(resultado.distribucion[0].montoProrrateado).toBe(50000);
      expect(resultado.distribucion[1].montoProrrateado).toBe(50000);
    });
  });
});
