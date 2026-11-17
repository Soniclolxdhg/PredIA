export interface AlertaHeladaDto {
  idAlerta: number;
  tipoAlerta?: string;
  mensaje: string;
  fechaEmision: string;
  estado: 'ABIERTA' | 'ATENDIDA';
  datosClima?: {
    fecha: string;
    tempMinimaC: number;
    tempMaximaC: number;
    riesgoHelada: boolean;
  };
}

export interface PronosticoClimaItemDto {
  idRegistroClima?: number;
  fecha: string;
  tempMinimaC: number;
  tempMaximaC: number;
  probabilidadPrecipitacionPct: number;
  precipitacionMm?: number;
  riesgoHelada: boolean;
  descripcionClima?: string;
  alertaHelada?: AlertaHeladaDto | null;
}

export interface PronosticoClimaResponseDto {
  fuente: string;
  coordenadas: {
    latitud: number;
    longitud: number;
  };
  fechaConsulta: string;
  umbralHeladaCritica: number;
  totalDias: number;
  diasConRiesgoHelada: number;
  pronostico: PronosticoClimaItemDto[];
}

export interface SincronizarClimaDto {
  latitud?: number;
  longitud?: number;
  diasPronostico?: number;
}

export interface AtenderAlertaHeladaDto {
  estado: 'ATENDIDA';
  observacion: string;
}
