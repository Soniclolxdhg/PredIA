import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EstadoCiclo, EstadoPago, ModalidadPago } from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { CrearTrabajadorDto } from './dto/crear-trabajador.dto';
import { ActualizarTrabajadorDto } from './dto/actualizar-trabajador.dto';
import { RegistrarAsistenciaDto } from './dto/registrar-asistencia.dto';
import { CrearCostoIndirectoDto } from './dto/crear-costo-indirecto.dto';
import { ProrratearGastoDto } from './dto/prorratear-gasto.dto';

@Injectable()
export class CostLaborService {
  private readonly registrador = new Logger(CostLaborService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  // ==========================================
  // 1. NÓMINA DE TRABAJADORES
  // ==========================================

  async listarTrabajadores(activo?: boolean) {
    return this.prisma.trabajador.findMany({
      where: {
        ...(activo !== undefined ? { activo } : {}),
      },
      orderBy: { apellidos: 'asc' },
      include: {
        _count: {
          select: { asistenciasJornal: true },
        },
      },
    });
  }

  async obtenerTrabajadorPorId(idTrabajador: number) {
    const trabajador = await this.prisma.trabajador.findUnique({
      where: { idTrabajador },
      include: {
        asistenciasJornal: {
          take: 15,
          orderBy: { fechaJornada: 'desc' },
          include: {
            cicloCultivo: {
              select: { idCiclo: true, temporada: true, variedad: true },
            },
          },
        },
      },
    });

    if (!trabajador) {
      throw new NotFoundException(`El trabajador con ID ${idTrabajador} no existe.`);
    }

    return trabajador;
  }

  async crearTrabajador(dto: CrearTrabajadorDto) {
    const existente = await this.prisma.trabajador.findUnique({
      where: { rut: dto.rut },
    });

    if (existente) {
      throw new ConflictException(`El trabajador con RUT '${dto.rut}' ya se encuentra registrado.`);
    }

    return this.prisma.trabajador.create({
      data: {
        rut: dto.rut,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        cargo: dto.cargo,
        modalidadPago: dto.modalidadPago,
        tarifaBase: dto.tarifaBase,
        activo: dto.activo ?? true,
      },
    });
  }

  async actualizarTrabajador(idTrabajador: number, dto: ActualizarTrabajadorDto) {
    await this.obtenerTrabajadorPorId(idTrabajador);

    return this.prisma.trabajador.update({
      where: { idTrabajador },
      data: {
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        cargo: dto.cargo,
        modalidadPago: dto.modalidadPago,
        tarifaBase: dto.tarifaBase,
        activo: dto.activo,
      },
    });
  }

  // ==========================================
  // 2. ASISTENCIA Y JORNALES DEVENGADOS (HU06 / CU07)
  // ==========================================

  /**
   * Registra la jornada de trabajo, calcula el devengado e imputa el costo al Ciclo de Cultivo
   */
  async registrarAsistencia(dto: RegistrarAsistenciaDto) {
    return this.prisma.$transaction(async (tx) => {
      const trabajador = await tx.trabajador.findUnique({
        where: { idTrabajador: dto.idTrabajador },
      });

      if (!trabajador) {
        throw new NotFoundException(`El trabajador con ID ${dto.idTrabajador} no existe.`);
      }

      if (!trabajador.activo) {
        throw new BadRequestException(`El trabajador ${trabajador.nombres} ${trabajador.apellidos} está inactivo.`);
      }

      const ciclo = await tx.cicloCultivo.findUnique({
        where: { idCiclo: dto.idCiclo },
      });

      if (!ciclo) {
        throw new NotFoundException(`El ciclo de cultivo con ID ${dto.idCiclo} no existe.`);
      }

      if (ciclo.estado !== EstadoCiclo.ACTIVO) {
        throw new BadRequestException('No se pueden imputar horas a un ciclo finalizado o cancelado.');
      }

      if (dto.idLabor) {
        const labor = await tx.laborAgricola.findUnique({
          where: { idLabor: dto.idLabor },
        });

        if (!labor || labor.idCiclo !== dto.idCiclo) {
          throw new BadRequestException(`La labor con ID ${dto.idLabor} no pertenece al ciclo indicado.`);
        }
      }

      // Cálculo de tarifa por hora según modalidad de contratación si no viene explícita
      let valorHora = dto.valorHoraAplicado;
      if (!valorHora) {
        const tarifaBase = Number(trabajador.tarifaBase);
        switch (trabajador.modalidadPago) {
          case ModalidadPago.DIARIO:
            valorHora = Number((tarifaBase / 8).toFixed(2));
            break;
          case ModalidadPago.SEMANAL:
            valorHora = Number((tarifaBase / 45).toFixed(2));
            break;
          case ModalidadPago.QUINCENAL:
            valorHora = Number((tarifaBase / 90).toFixed(2));
            break;
          case ModalidadPago.MENSUAL:
            valorHora = Number((tarifaBase / 180).toFixed(2));
            break;
          default:
            valorHora = tarifaBase;
        }
      }

      const montoDevengado = Number((dto.horasTrabajadas * valorHora).toFixed(2));

      // 1. Crear el registro de asistencia jornal
      const asistencia = await tx.asistenciaJornal.create({
        data: {
          idTrabajador: dto.idTrabajador,
          idCiclo: dto.idCiclo,
          idLabor: dto.idLabor,
          fechaJornada: new Date(dto.fechaJornada),
          horasTrabajadas: dto.horasTrabajadas,
          valorHoraAplicado: valorHora,
          montoDevengado,
          estadoPago: dto.estadoPago ?? EstadoPago.PENDIENTE,
        },
        include: {
          trabajador: {
            select: {
              rut: true,
              nombres: true,
              apellidos: true,
              cargo: true,
            },
          },
          cicloCultivo: {
            select: {
              idCiclo: true,
              temporada: true,
              variedad: true,
            },
          },
        },
      });

      // 2. Imputar el costo devengado directamente al costo acumulado del ciclo
      await tx.cicloCultivo.update({
        where: { idCiclo: dto.idCiclo },
        data: {
          costoTotalAcumulado: {
            increment: montoDevengado,
          },
        },
      });

      return {
        mensaje: 'Jornada laboral registrada e imputada al ciclo exitosamente',
        asistencia,
        montoDevengadoImputado: montoDevengado,
      };
    });
  }

  async listarAsistencias(idCiclo?: number, idTrabajador?: number, estadoPago?: EstadoPago) {
    return this.prisma.asistenciaJornal.findMany({
      where: {
        ...(idCiclo ? { idCiclo } : {}),
        ...(idTrabajador ? { idTrabajador } : {}),
        ...(estadoPago ? { estadoPago } : {}),
      },
      orderBy: { fechaJornada: 'desc' },
      include: {
        trabajador: {
          select: {
            idTrabajador: true,
            rut: true,
            nombres: true,
            apellidos: true,
            cargo: true,
            modalidadPago: true,
          },
        },
        cicloCultivo: {
          select: {
            idCiclo: true,
            temporada: true,
            variedad: true,
          },
        },
      },
    });
  }

  async cambiarEstadoPago(idAsistencia: number, estadoPago: EstadoPago) {
    const asistencia = await this.prisma.asistenciaJornal.findUnique({
      where: { idAsistencia },
    });

    if (!asistencia) {
      throw new NotFoundException(`La asistencia con ID ${idAsistencia} no existe.`);
    }

    return this.prisma.asistenciaJornal.update({
      where: { idAsistencia },
      data: { estadoPago },
    });
  }

  // ==========================================
  // 3. PRORRATEO DE COSTOS INDIRECTOS (HU07 / CU08)
  // ==========================================

  /**
   * Imputación directa de un gasto indirecto a un ciclo de cultivo específico
   */
  async crearCostoIndirecto(dto: CrearCostoIndirectoDto) {
    return this.prisma.$transaction(async (tx) => {
      const ciclo = await tx.cicloCultivo.findUnique({
        where: { idCiclo: dto.idCiclo },
      });

      if (!ciclo) {
        throw new NotFoundException(`El ciclo con ID ${dto.idCiclo} no existe.`);
      }

      if (ciclo.estado !== EstadoCiclo.ACTIVO) {
        throw new BadRequestException('No se pueden imputar costos indirectos a un ciclo inactivo.');
      }

      const costoIndirecto = await tx.costoIndirecto.create({
        data: {
          idCiclo: dto.idCiclo,
          tipoGasto: dto.tipoGasto,
          comprobanteFactura: dto.comprobanteFactura,
          fechaImputacion: new Date(dto.fechaImputacion),
          montoTotalProrrateado: dto.montoTotalProrrateado,
          criterioDistribucion: dto.criterioDistribucion,
          glosaDetalle: dto.glosaDetalle,
        },
        include: {
          cicloCultivo: {
            select: { idCiclo: true, temporada: true, variedad: true },
          },
        },
      });

      // Imputar al ciclo
      await tx.cicloCultivo.update({
        where: { idCiclo: dto.idCiclo },
        data: {
          costoTotalAcumulado: {
            increment: dto.montoTotalProrrateado,
          },
        },
      });

      return costoIndirecto;
    });
  }

  /**
   * Prorratea una factura o gasto general entre TODOS los ciclos activos (por Superficie M2 o Equitativo)
   */
  async prorratearGastoEntreCiclosActivos(dto: ProrratearGastoDto) {
    return this.prisma.$transaction(async (tx) => {
      const ciclosActivos = await tx.cicloCultivo.findMany({
        where: { estado: EstadoCiclo.ACTIVO },
        include: { nave: true },
      });

      if (ciclosActivos.length === 0) {
        throw new BadRequestException('No existen ciclos de cultivo activos para prorratear el gasto.');
      }

      const fechaImp = new Date(dto.fechaImputacion);
      const montoTotal = dto.montoTotalFactura;
      const resultados: any[] = [];

      if (dto.criterio === 'EQUITATIVO') {
        const montoPorCiclo = Number((montoTotal / ciclosActivos.length).toFixed(2));

        for (const ciclo of ciclosActivos) {
          const gasto = await tx.costoIndirecto.create({
            data: {
              idCiclo: ciclo.idCiclo,
              tipoGasto: dto.tipoGasto,
              comprobanteFactura: dto.comprobanteFactura,
              fechaImputacion: fechaImp,
              montoTotalProrrateado: montoPorCiclo,
              criterioDistribucion: 'EQUITATIVO',
              glosaDetalle: dto.glosaDetalle,
            },
          });

          await tx.cicloCultivo.update({
            where: { idCiclo: ciclo.idCiclo },
            data: { costoTotalAcumulado: { increment: montoPorCiclo } },
          });

          resultados.push({
            idCiclo: ciclo.idCiclo,
            nave: ciclo.nave.codigoNave,
            montoProrrateado: montoPorCiclo,
          });
        }
      } else {
        // Criterio: SUPERFICIE_M2
        const superficieTotal = ciclosActivos.reduce(
          (acc, c) => acc + Number(c.nave.superficieM2),
          0,
        );

        if (superficieTotal === 0) {
          throw new BadRequestException('La superficie total de las naves activas es 0 m2.');
        }

        for (const ciclo of ciclosActivos) {
          const supCiclo = Number(ciclo.nave.superficieM2);
          const proporcion = supCiclo / superficieTotal;
          const montoCiclo = Number((montoTotal * proporcion).toFixed(2));

          await tx.costoIndirecto.create({
            data: {
              idCiclo: ciclo.idCiclo,
              tipoGasto: dto.tipoGasto,
              comprobanteFactura: dto.comprobanteFactura,
              fechaImputacion: fechaImp,
              montoTotalProrrateado: montoCiclo,
              criterioDistribucion: `SUPERFICIE_M2 (${supCiclo}m2 de ${superficieTotal}m2 - ${(proporcion * 100).toFixed(1)}%)`,
              glosaDetalle: dto.glosaDetalle,
            },
          });

          await tx.cicloCultivo.update({
            where: { idCiclo: ciclo.idCiclo },
            data: { costoTotalAcumulado: { increment: montoCiclo } },
          });

          resultados.push({
            idCiclo: ciclo.idCiclo,
            nave: ciclo.nave.codigoNave,
            superficieM2: supCiclo,
            proporcionPorcentaje: Number((proporcion * 100).toFixed(2)),
            montoProrrateado: montoCiclo,
          });
        }
      }

      return {
        mensaje: `Gasto '${dto.tipoGasto}' prorrateado exitosamente entre ${ciclosActivos.length} ciclos activos`,
        criterio: dto.criterio,
        montoTotalFactura: montoTotal,
        distribucion: resultados,
      };
    });
  }

  async listarCostosIndirectos(idCiclo?: number) {
    return this.prisma.costoIndirecto.findMany({
      where: {
        ...(idCiclo ? { idCiclo } : {}),
      },
      orderBy: { fechaImputacion: 'desc' },
      include: {
        cicloCultivo: {
          select: {
            idCiclo: true,
            temporada: true,
            variedad: true,
            nave: {
              select: { codigoNave: true, nombre: true },
            },
          },
        },
      },
    });
  }
}

