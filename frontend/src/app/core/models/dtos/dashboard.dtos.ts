export interface KpisProduccionDto {
  totalNaves: number;
  navesEnCultivo: number;
  navesDisponibles: number;
  navesEnMantencion: number;
  superficieTotalM2: number;
  ciclosActivosCount: number;
  kilosCosechadosTotales: number;
  kilosDisponiblesVenta: number;
  rendimientoMedioM2: number;
}

export interface KpisCostosDto {
  costoTotalAcumuladoCLP: number;
  costoPromedioPonderadoKg: number;
  desgloseEstructura: {
    insumosAgricolasCLP: number;
    manoObraDevengadaCLP: number;
    costosIndirectosCLP: number;
  };
}

export interface KpisComercialDto {
  totalNotasVenta: number;
  kilosVendidosTotales: number;
  ingresosTotalesCLP: number;
  margenBrutoTotalCLP: number;
  margenBrutoPromedioPct: number;
  despacho: {
    pendientes: number;
    despachados: number;
    entregados: number;
  };
}

export interface KpisAlertasRiesgoDto {
  alertasStockCriticoAbiertas: number;
  alertasHeladaAbiertas: number;
  diasConRiesgoHeladaProximos7Dias: number;
  alertaHeladaActivaInminente: boolean;
}

export interface DashboardKpisDto {
  produccion: KpisProduccionDto;
  costos: KpisCostosDto;
  comercial: KpisComercialDto;
  alertasYRiesgo: KpisAlertasRiesgoDto;
}

export interface ChartDatasetDto {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  tension?: number;
  borderDash?: number[];
  pointRadius?: number;
  fill?: boolean;
  hoverOffset?: number;
}

export interface ChartConfigDto {
  tipo: string;
  titulo: string;
  labels: string[];
  datasets: ChartDatasetDto[];
}

export interface DashboardGraficosDto {
  rendimientoPorNave: ChartConfigDto;
  evolucionFinanciera: ChartConfigDto;
  estructuraCostos: ChartConfigDto;
  pronosticoClimatico: ChartConfigDto;
  ventasPorVariedad: ChartConfigDto;
}

export interface ProyeccionCicloDto {
  idCiclo: number;
  variedad: string;
  temporada: string;
  nave: string;
  superficieM2: number;
  rendimientoKgEstimado: number;
  costoCierreEstimado: number;
  costoEstimadoPorKg: number;
  nivelRiesgoClimatico: 'ALTO' | 'MEDIO' | 'BAJO';
  versionModelo?: string;
  recomendacionAgroclimatica: string;
}

export interface DashboardEjecutivoResponse {
  fechaGeneracion: string;
  kpisDirectivos: DashboardKpisDto;
  graficosChartJs: DashboardGraficosDto;
  proyeccionesPredictivas: ProyeccionCicloDto[];
}
