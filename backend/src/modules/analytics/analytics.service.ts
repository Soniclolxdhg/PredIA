import { Injectable, Logger } from '@nestjs/common';
import {
  EstadoCiclo,
  EstadoNave,
  EstadoAlerta,
  TipoAlerta,
  EstadoDespacho,
  TipoMovimientoBodega,
  NivelRiesgoClimatico,
} from '@prisma/client';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';

@Injectable()
export class AnalyticsService {
  private readonly registrador = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: ServicioPrisma,
    private readonly weatherService: WeatherService,
  ) {}

  /**
   * Consolida el Dashboard Ejecutivo completo para la Gerencia General (HU11).
   * Agrupa: KPIs directivos, 5 estructuras listas para Chart.js y Proyecciones agronómicas.
   */
  async obtenerDashboardEjecutivo() {
    this.registrador.log('Generando consolidado de Dashboard Ejecutivo (HU11)...');

    const [kpis, graficos, proyecciones] = await Promise.all([
      this.obtenerKpisDirectivos(),
      this.obtenerGraficosChartJs(),
      this.obtenerProyeccionesCiclos(),
    ]);

    return {
      fechaGeneracion: new Date(),
      kpisDirectivos: kpis,
      graficosChartJs: graficos,
      proyeccionesPredictivas: proyecciones,
    };
  }

  /**
   * Calcula los Indicadores Clave de Rendimiento (KPIs directivos) en Producción,
   * Costos, Comercialización y Alertas Operativas.
   */
  async obtenerKpisDirectivos() {
    // 1. Métricas de Producción
    const naves = await this.prisma.nave.findMany();
    const totalNaves = naves.length;
    const navesEnCultivo = naves.filter((n) => n.estado === EstadoNave.EN_CULTIVO).length;
    const navesDisponibles = naves.filter((n) => n.estado === EstadoNave.DISPONIBLE).length;
    const navesEnMantencion = naves.filter((n) => n.estado === EstadoNave.MANTENCION).length;
    const superficieTotalM2 = naves.reduce((sum, n) => sum + Number(n.superficieM2), 0);

    const ciclosActivos = await this.prisma.cicloCultivo.findMany({
      where: { estado: EstadoCiclo.ACTIVO },
    });

    const cosechas = await this.prisma.cosecha.findMany({
      select: { kilosNetos: true, kilosDisponiblesVenta: true },
    });

    const kilosCosechadosTotales = cosechas.reduce((sum, c) => sum + Number(c.kilosNetos), 0);
    const kilosDisponiblesVenta = cosechas.reduce(
      (sum, c) => sum + Number(c.kilosDisponiblesVenta),
      0,
    );
    const rendimientoMedioM2 =
      superficieTotalM2 > 0 ? Math.round((kilosCosechadosTotales / superficieTotalM2) * 100) / 100 : 0;

    // 2. Métricas de Costos
    const ciclos = await this.prisma.cicloCultivo.findMany({
      select: {
        idCiclo: true,
        costoTotalAcumulado: true,
        costoUnitarioKg: true,
        totalKgCosechados: true,
        estado: true,
      },
    });

    const costoTotalAcumulado = ciclos.reduce(
      (sum, c) => sum + Number(c.costoTotalAcumulado),
      0,
    );

    const ciclosFinalizados = ciclos.filter(
      (c) => c.estado === EstadoCiclo.FINALIZADO && Number(c.costoUnitarioKg) > 0,
    );

    const costoPromedioPonderadoKg =
      ciclosFinalizados.length > 0
        ? Math.round(
            ciclosFinalizados.reduce((sum, c) => sum + Number(c.costoUnitarioKg), 0) /
              ciclosFinalizados.length,
          )
        : 0;

    // Desglose de Costos Operativos
    const movimientosInsumos = await this.prisma.movimientoBodega.findMany({
      where: { tipoMovimiento: TipoMovimientoBodega.SALIDA_LABOR },
      select: { montoTotalMovimiento: true },
    });
    const totalInsumos = movimientosInsumos.reduce(
      (sum, m) => sum + Number(m.montoTotalMovimiento),
      0,
    );

    const asistencias = await this.prisma.asistenciaJornal.findMany({
      select: { montoDevengado: true },
    });
    const totalManoObra = asistencias.reduce((sum, a) => sum + Number(a.montoDevengado), 0);

    const indirectos = await this.prisma.costoIndirecto.findMany({
      select: { montoTotalProrrateado: true },
    });
    const totalIndirectos = indirectos.reduce(
      (sum, i) => sum + Number(i.montoTotalProrrateado),
      0,
    );

    // 3. Métricas Comerciales & Ventas
    const ventas = await this.prisma.venta.findMany({
      select: {
        kilosVendidos: true,
        montoTotalIngreso: true,
        margenBrutoOperativo: true,
        estadoDespacho: true,
      },
    });

    const ingresosTotalesCLP = ventas.reduce((sum, v) => sum + Number(v.montoTotalIngreso), 0);
    const margenBrutoTotalCLP = ventas.reduce(
      (sum, v) => sum + Number(v.margenBrutoOperativo),
      0,
    );
    const kilosVendidosTotales = ventas.reduce((sum, v) => sum + Number(v.kilosVendidos), 0);
    const margenBrutoPromedioPct =
      ingresosTotalesCLP > 0
        ? Math.round((margenBrutoTotalCLP / ingresosTotalesCLP) * 10000) / 100
        : 0;

    const pedidosPendientes = ventas.filter((v) => v.estadoDespacho === EstadoDespacho.PENDIENTE).length;
    const pedidosDespachados = ventas.filter((v) => v.estadoDespacho === EstadoDespacho.DESPACHADO).length;
    const pedidosEntregados = ventas.filter((v) => v.estadoDespacho === EstadoDespacho.ENTREGADO).length;

    // 4. Métricas de Alertas y Clima
    const alertasAbiertas = await this.prisma.alerta.findMany({
      where: { estado: EstadoAlerta.ABIERTA },
      select: { tipoAlerta: true },
    });

    const alertasStockCritico = alertasAbiertas.filter(
      (a) => a.tipoAlerta === TipoAlerta.STOCK_MINIMO,
    ).length;
    const alertasHeladaAbiertas = alertasAbiertas.filter(
      (a) => a.tipoAlerta === TipoAlerta.HELADA,
    ).length;

    const pronostico7Dias = await this.weatherService.obtenerPronostico7Dias();
    const diasConRiesgoHelada = pronostico7Dias.pronostico.filter(
      (d: any) => d.riesgoHelada,
    ).length;

    return {
      produccion: {
        totalNaves,
        navesEnCultivo,
        navesDisponibles,
        navesEnMantencion,
        superficieTotalM2,
        ciclosActivosCount: ciclosActivos.length,
        kilosCosechadosTotales: Math.round(kilosCosechadosTotales * 100) / 100,
        kilosDisponiblesVenta: Math.round(kilosDisponiblesVenta * 100) / 100,
        rendimientoMedioM2,
      },
      costos: {
        costoTotalAcumuladoCLP: Math.round(costoTotalAcumulado),
        costoPromedioPonderadoKg,
        desgloseEstructura: {
          insumosAgricolasCLP: Math.round(totalInsumos),
          manoObraDevengadaCLP: Math.round(totalManoObra),
          costosIndirectosCLP: Math.round(totalIndirectos),
        },
      },
      comercial: {
        totalNotasVenta: ventas.length,
        kilosVendidosTotales: Math.round(kilosVendidosTotales * 100) / 100,
        ingresosTotalesCLP: Math.round(ingresosTotalesCLP),
        margenBrutoTotalCLP: Math.round(margenBrutoTotalCLP),
        margenBrutoPromedioPct,
        despacho: {
          pendientes: pedidosPendientes,
          despachados: pedidosDespachados,
          entregados: pedidosEntregados,
        },
      },
      alertasYRiesgo: {
        alertasStockCriticoAbiertas: alertasStockCritico,
        alertasHeladaAbiertas,
        diasConRiesgoHeladaProximos7Dias: diasConRiesgoHelada,
        alertaHeladaActivaInminente: diasConRiesgoHelada > 0,
      },
    };
  }

  /**
   * Genera las 5 estructuras de datos listas para renderizado con Chart.js en Frontend (HU11).
   */
  async obtenerGraficosChartJs() {
    // ----------------------------------------------------
    // GRÁFICO 1: Rendimiento por Nave (Bar Chart)
    // ----------------------------------------------------
    const naves = await this.prisma.nave.findMany({
      include: {
        ciclosCultivo: {
          include: {
            cosechas: {
              select: { kilosNetos: true },
            },
          },
        },
      },
      orderBy: { codigoNave: 'asc' },
    });

    const labelsNaves: string[] = [];
    const dataKilosNaves: number[] = [];
    const dataSuperficieNaves: number[] = [];

    for (const nave of naves) {
      labelsNaves.push(`${nave.codigoNave} - ${nave.nombre}`);
      dataSuperficieNaves.push(Number(nave.superficieM2));

      let kilos = 0;
      for (const ciclo of nave.ciclosCultivo) {
        for (const c of ciclo.cosechas) {
          kilos += Number(c.kilosNetos);
        }
      }
      dataKilosNaves.push(Math.round(kilos));
    }

    const graficoRendimientoNaves = {
      tipo: 'bar',
      titulo: 'Rendimiento y Producción por Nave (Kg cosechados vs Superficie m²)',
      labels: labelsNaves,
      datasets: [
        {
          label: 'Kilos Cosechados (Kg)',
          data: dataKilosNaves,
          backgroundColor: 'rgba(16, 185, 129, 0.8)', // Verde esmeralda
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
        },
        {
          label: 'Superficie (m²)',
          data: dataSuperficieNaves,
          backgroundColor: 'rgba(59, 130, 246, 0.5)', // Azul
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    };

    // ----------------------------------------------------
    // GRÁFICO 2: Evolución Financiera Mensual (Ingresos vs Costos vs Margen)
    // ----------------------------------------------------
    const ventas = await this.prisma.venta.findMany({
      select: {
        fechaVenta: true,
        montoTotalIngreso: true,
        margenBrutoOperativo: true,
        costoUnitarioCicloRef: true,
        kilosVendidos: true,
      },
      orderBy: { fechaVenta: 'asc' },
    });

    const mesesMap = new Map<string, { ingresos: number; costos: number; margen: number }>();

    for (const v of ventas) {
      const fecha = new Date(v.fechaVenta);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const item = mesesMap.get(key) || { ingresos: 0, costos: 0, margen: 0 };

      const ingreso = Number(v.montoTotalIngreso);
      const costo = Number(v.kilosVendidos) * Number(v.costoUnitarioCicloRef);
      const margen = Number(v.margenBrutoOperativo);

      item.ingresos += ingreso;
      item.costos += costo;
      item.margen += margen;
      mesesMap.set(key, item);
    }

    // Si no hay ventas suficientes, colocar meses actuales para que el gráfico siempre renderice
    if (mesesMap.size === 0) {
      const hoy = new Date();
      for (let m = 2; m >= 0; m--) {
        const d = new Date(hoy.getFullYear(), hoy.getMonth() - m, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mesesMap.set(key, { ingresos: 0, costos: 0, margen: 0 });
      }
    }

    const labelsMeses = Array.from(mesesMap.keys());
    const dataIngresos = labelsMeses.map((m) => Math.round(mesesMap.get(m)!.ingresos));
    const dataCostos = labelsMeses.map((m) => Math.round(mesesMap.get(m)!.costos));
    const dataMargen = labelsMeses.map((m) => Math.round(mesesMap.get(m)!.margen));

    const graficoEvolucionFinanciera = {
      tipo: 'bar',
      titulo: 'Evolución Comercial (Ingresos vs Costos de Venta vs Margen Bruto)',
      labels: labelsMeses,
      datasets: [
        {
          label: 'Ingresos Totales ($)',
          data: dataIngresos,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        },
        {
          label: 'Costos de Venta ($)',
          data: dataCostos,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
        },
        {
          label: 'Margen Bruto ($)',
          data: dataMargen,
          backgroundColor: 'rgba(245, 158, 11, 0.9)',
        },
      ],
    };

    // ----------------------------------------------------
    // GRÁFICO 3: Estructura de Costos del Predio (Doughnut Chart)
    // ----------------------------------------------------
    const movs = await this.prisma.movimientoBodega.findMany({
      where: { tipoMovimiento: TipoMovimientoBodega.SALIDA_LABOR },
      select: { montoTotalMovimiento: true },
    });
    const montoInsumos = movs.reduce((s, m) => s + Number(m.montoTotalMovimiento), 0);

    const asists = await this.prisma.asistenciaJornal.findMany({
      select: { montoDevengado: true },
    });
    const montoManoObra = asists.reduce((s, a) => s + Number(a.montoDevengado), 0);

    const indirs = await this.prisma.costoIndirecto.findMany({
      select: { montoTotalProrrateado: true },
    });
    const montoIndirectos = indirs.reduce((s, i) => s + Number(i.montoTotalProrrateado), 0);

    const graficoEstructuraCostos = {
      tipo: 'doughnut',
      titulo: 'Composición de Costos Operativos Totales',
      labels: ['Insumos Agrícolas', 'Mano de Obra Directa', 'Costos Indirectos y Prorrateo'],
      datasets: [
        {
          data: [Math.round(montoInsumos), Math.round(montoManoObra), Math.round(montoIndirectos)],
          backgroundColor: ['#3B82F6', '#F59E0B', '#8B5CF6'],
          hoverOffset: 6,
        },
      ],
    };

    // ----------------------------------------------------
    // GRÁFICO 4: Pronóstico Agroclimático a 7 Días & Heladas (Line/Combo Chart)
    // ----------------------------------------------------
    const climaData = await this.weatherService.obtenerPronostico7Dias();
    const dias = climaData.pronostico || [];

    const labelsClima = dias.map((d: any) => d.fecha);
    const dataTempMax = dias.map((d: any) => d.tempMaximaC);
    const dataTempMin = dias.map((d: any) => d.tempMinimaC);
    const umbralHelada = dias.map(() => 2.0); // Línea constante de referencia 2°C

    const graficoPronosticoClimatico = {
      tipo: 'line',
      titulo: 'Pronóstico Agroclimático a 7 Días (Open-Meteo) y Umbral de Helada',
      labels: labelsClima,
      datasets: [
        {
          label: 'Temp. Máxima (°C)',
          data: dataTempMax,
          borderColor: 'rgb(249, 115, 22)', // Naranja cálido
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Temp. Mínima (°C)',
          data: dataTempMin,
          borderColor: 'rgb(6, 182, 212)', // Cian frío
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Umbral Crítico Helada (2.0°C)',
          data: umbralHelada,
          borderColor: 'rgb(239, 68, 68)', // Rojo alerta
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false,
        },
      ],
    };

    // ----------------------------------------------------
    // GRÁFICO 5: Ventas y Margen por Variedad de Cultivo (Horizontal Bar)
    // ----------------------------------------------------
    const ventasConDetalle = await this.prisma.venta.findMany({
      include: {
        cosecha: {
          include: {
            cicloCultivo: { select: { variedad: true } },
          },
        },
      },
    });

    const variedadMap = new Map<string, { kilos: number; margen: number; ingresos: number }>();

    for (const v of ventasConDetalle) {
      const variedad = v.cosecha?.cicloCultivo.variedad || 'Tomate Tradicional';
      const item = variedadMap.get(variedad) || { kilos: 0, margen: 0, ingresos: 0 };
      item.kilos += Number(v.kilosVendidos);
      item.ingresos += Number(v.montoTotalIngreso);
      item.margen += Number(v.margenBrutoOperativo);
      variedadMap.set(variedad, item);
    }

    const labelsVariedad = Array.from(variedadMap.keys());
    const dataKilosVar = labelsVariedad.map((v) => Math.round(variedadMap.get(v)!.kilos));
    const dataMargenVar = labelsVariedad.map((v) => Math.round(variedadMap.get(v)!.margen));

    const graficoMargenPorVariedad = {
      tipo: 'bar',
      titulo: 'Volumen de Ventas y Margen Bruto por Variedad de Tomate',
      labels: labelsVariedad.length > 0 ? labelsVariedad : ['Tomate Cherry', 'Tomate Larga Vida'],
      datasets: [
        {
          label: 'Kilos Vendidos (Kg)',
          data: dataKilosVar.length > 0 ? dataKilosVar : [0, 0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Margen Bruto ($)',
          data: dataMargenVar.length > 0 ? dataMargenVar : [0, 0],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
        },
      ],
    };

    return {
      rendimientoPorNave: graficoRendimientoNaves,
      evolucionFinanciera: graficoEvolucionFinanciera,
      estructuraCostos: graficoEstructuraCostos,
      pronosticoClimatico: graficoPronosticoClimatico,
      ventasPorVariedad: graficoMargenPorVariedad,
    };
  }

  /**
   * Genera o consulta las proyecciones predictivas de rendimiento y costo de cierre (HU11 / Tabla 20).
   */
  async obtenerProyeccionesCiclos() {
    const ciclosActivos = await this.prisma.cicloCultivo.findMany({
      where: { estado: EstadoCiclo.ACTIVO },
      include: {
        nave: { select: { codigoNave: true, nombre: true, superficieM2: true } },
        cosechas: { select: { kilosNetos: true } },
      },
    });

    const pronosticoClima = await this.weatherService.obtenerPronostico7Dias();
    const hayRiesgoHelada = pronosticoClima.pronostico.some((d: any) => d.riesgoHelada);

    const proyecciones = [];

    for (const ciclo of ciclosActivos) {
      const sup = Number(ciclo.nave.superficieM2);
      const kgActuales = ciclo.cosechas.reduce((sum, c) => sum + Number(c.kilosNetos), 0);
      const costoAcumulado = Number(ciclo.costoTotalAcumulado);

      // Algoritmo de estimación predictiva:
      // Rendimiento estimado = Max(kgActuales * 1.35, superficie * 15 Kg/m2 para tomate en invernadero)
      const rendimientoKgEstimado = Math.round(Math.max(kgActuales * 1.35, sup * 15.0));

      // Costo de cierre proyectado = Costo acumulado + 25% estimado de labores restantes
      const costoCierreEstimado = Math.round(costoAcumulado > 0 ? costoAcumulado * 1.25 : sup * 6500);

      // Evaluación del riesgo agroclimático según el pronóstico Open-Meteo
      const nivelRiesgoClimatico = hayRiesgoHelada
        ? NivelRiesgoClimatico.ALTO
        : NivelRiesgoClimatico.BAJO;

      const proyeccion = {
        idCiclo: ciclo.idCiclo,
        variedad: ciclo.variedad,
        temporada: ciclo.temporada,
        nave: `${ciclo.nave.codigoNave} - ${ciclo.nave.nombre}`,
        superficieM2: sup,
        rendimientoKgEstimado,
        costoCierreEstimado,
        costoEstimadoPorKg:
          rendimientoKgEstimado > 0
            ? Math.round((costoCierreEstimado / rendimientoKgEstimado) * 100) / 100
            : 0,
        nivelRiesgoClimatico,
        versionModelo: 'PredIA-ML-v1.2',
        recomendacionAgroclimatica: hayRiesgoHelada
          ? 'Riesgo alto de helada en los próximos 7 días. Activar calefacción térmica en la nave y revisar cortinas perimetrales.'
          : 'Condiciones meteorológicas favorables. Continuar con el plan de fertirriego y podas programadas.',
      };

      // Guardar o actualizar registro en Tabla 20 (ProyeccionCiclo)
      await this.prisma.proyeccionCiclo.create({
        data: {
          idCiclo: ciclo.idCiclo,
          rendimientoKgEstimado,
          costoCierreEstimado,
          nivelRiesgoClimatico,
          versionModelo: 'PredIA-ML-v1.2',
        },
      });

      proyecciones.push(proyeccion);
    }

    return proyecciones;
  }
}

