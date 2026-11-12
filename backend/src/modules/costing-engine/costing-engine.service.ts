import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TipoMovimientoBodega } from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';

@Injectable()
export class CostingEngineService {
  private readonly registrador = new Logger(CostingEngineService.name);

  constructor(private readonly prisma: ServicioPrisma) {}

  /**
   * Obtiene la estructura analítica consolidada de costos de un ciclo (HU09 / CU09)
   * Desglosando: Insumos de Bodega, Mano de Obra Directa y Costos Indirectos
   */
  async obtenerEstructuraCostosCiclo(idCiclo: number) {
    const ciclo = await this.prisma.cicloCultivo.findUnique({
      where: { idCiclo },
      include: {
        nave: {
          select: { codigoNave: true, nombre: true, superficieM2: true },
        },
      },
    });

    if (!ciclo) {
      throw new NotFoundException(`El ciclo con ID ${idCiclo} no existe.`);
    }

    // 1. Total Mano de Obra Directa (Jornales devengados imputados al ciclo)
    const asistencias = await this.prisma.asistenciaJornal.findMany({
      where: { idCiclo },
      select: { montoDevengado: true, horasTrabajadas: true },
    });

    const totalManoObra = asistencias.reduce(
      (sum, a) => sum + Number(a.montoDevengado),
      0,
    );
    const totalHorasHombre = asistencias.reduce(
      (sum, a) => sum + Number(a.horasTrabajadas),
      0,
    );

    // 2. Total Insumos Directos (Movimientos de bodega tipo SALIDA_LABOR asociados al ciclo)
    const movimientosInsumos = await this.prisma.movimientoBodega.findMany({
      where: {
        tipoMovimiento: TipoMovimientoBodega.SALIDA_LABOR,
        laborAgricola: {
          idCiclo,
        },
      },
      select: { montoTotalMovimiento: true },
    });

    const totalInsumos = movimientosInsumos.reduce(
      (sum, m) => sum + Number(m.montoTotalMovimiento),
      0,
    );

    // 3. Total Costos Indirectos Prorrateados (Luz, agua, mantención)
    const costosIndirectos = await this.prisma.costoIndirecto.findMany({
      where: { idCiclo },
      select: { montoTotalProrrateado: true, tipoGasto: true },
    });

    const totalIndirectos = costosIndirectos.reduce(
      (sum, c) => sum + Number(c.montoTotalProrrateado),
      0,
    );

    // 4. Consolidación de Costo Total y Costo Unitario por Kg
    const costoTotalConsolidado = Number(
      (totalManoObra + totalInsumos + totalIndirectos).toFixed(2),
    );
    const totalKgCosechados = Number(ciclo.totalKgCosechados);

    const costoUnitarioRealKg =
      totalKgCosechados > 0
        ? Number((costoTotalConsolidado / totalKgCosechados).toFixed(2))
        : 0;

    // Participaciones porcentuales
    const pctManoObra =
      costoTotalConsolidado > 0
        ? Number(((totalManoObra / costoTotalConsolidado) * 100).toFixed(1))
        : 0;
    const pctInsumos =
      costoTotalConsolidado > 0
        ? Number(((totalInsumos / costoTotalConsolidado) * 100).toFixed(1))
        : 0;
    const pctIndirectos =
      costoTotalConsolidado > 0
        ? Number(((totalIndirectos / costoTotalConsolidado) * 100).toFixed(1))
        : 0;

    return {
      ciclo: {
        idCiclo: ciclo.idCiclo,
        temporada: ciclo.temporada,
        variedad: ciclo.variedad,
        estado: ciclo.estado,
        fechaInicio: ciclo.fechaInicio,
        fechaTerminoEstimada: ciclo.fechaTerminoEstimada,
        fechaCierreReal: ciclo.fechaCierreReal,
        nave: ciclo.nave,
      },
      produccion: {
        totalKgCosechados,
        costoUnitarioRealKg,
        costoUnitarioActualRegistrado: Number(ciclo.costoUnitarioKg),
      },
      consolidadoCostos: {
        costoTotalConsolidado,
        costoTotalAcumuladoRegistrado: Number(ciclo.costoTotalAcumulado),
      },
      desglose: {
        manoDeObra: {
          total: totalManoObra,
          horasHombreTotales: totalHorasHombre,
          participacionPorcentaje: pctManoObra,
          cantidadRegistros: asistencias.length,
        },
        insumos: {
          total: totalInsumos,
          participacionPorcentaje: pctInsumos,
          cantidadDespachos: movimientosInsumos.length,
        },
        costosIndirectos: {
          total: totalIndirectos,
          participacionPorcentaje: pctIndirectos,
          cantidadImputaciones: costosIndirectos.length,
        },
      },
    };
  }

  /**
   * Consolida y sincroniza formalmente los costos del ciclo en la base de datos (CU09)
   */
  async consolidarLiquidacionCiclo(idCiclo: number) {
    const estructura = await this.obtenerEstructuraCostosCiclo(idCiclo);

    const costoTotal = estructura.consolidadoCostos.costoTotalConsolidado;
    const costoUnitarioKg = estructura.produccion.costoUnitarioRealKg;

    const cicloActualizado = await this.prisma.cicloCultivo.update({
      where: { idCiclo },
      data: {
        costoTotalAcumulado: costoTotal,
        costoUnitarioKg,
      },
      include: {
        nave: {
          select: { codigoNave: true, nombre: true },
        },
      },
    });

    return {
      mensaje: `Costos del ciclo ${idCiclo} consolidados y liquidados exitosamente.`,
      ciclo: cicloActualizado,
      resumenCostos: {
        costoTotalAcumulado: Number(cicloActualizado.costoTotalAcumulado),
        totalKgCosechados: Number(cicloActualizado.totalKgCosechados),
        costoUnitarioKg: Number(cicloActualizado.costoUnitarioKg),
      },
      desglose: estructura.desglose,
    };
  }
}

