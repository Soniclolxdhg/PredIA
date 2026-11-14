export interface CrearAsistenciaDto {
  idTrabajador: number;
  idCiclo: number;
  idLabor?: number;
  fechaJornada: string;
  horasTrabajadas: number;
  valorHoraAplicado?: number;
  modalidadPago?: string;
  nombreTrabajador?: string;
}

export interface ActualizarEstadoPagoDto {
  estadoPago: 'PAGADO' | 'PENDIENTE' | 'CONCILIADO';
}

export interface ProrratearCostoIndirectoDto {
  tipoGasto: string;
  comprobanteFactura: string;
  fechaImputacion: string;
  montoTotalFactura: number;
  criterio: string;
  glosaDetalle: string;
  idCiclo?: number;
}

export interface DesgloseCostosDto {
  manoDeObraDirecta: number;
  insumosAgricolas: number;
  costosIndirectos: number;
  totalCostoAcumulado: number;
}

export interface IndicadoresCostosDto {
  costoPorMetroCuadrado: number;
  costoPorKiloNeto: number;
  margenBrutoEstimado?: number;
}

export interface LiquidacionCicloResponse {
  idCiclo: number;
  codigoCiclo: string;
  superficieM2: number;
  kilosProducidos: number;
  desglose: DesgloseCostosDto;
  indicadores: IndicadoresCostosDto;
  estadoLiquidacion: 'EN_PROCESO' | 'CERRADO';
}

