export interface CrearTrabajadorDto {
  rut: string;
  nombres: string;
  apellidos: string;
  cargo: 'OPERARIO_CAMPO' | 'COSECHADOR' | 'CHOFER' | 'MECANICO';
  modalidadPago: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
  tarifaBase: number;
  activo?: boolean;
}

export interface TrabajadorDto {
  idTrabajador: number;
  rut: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  modalidadPago: string;
  tarifaBase: number | string;
  activo: boolean;
}

export interface CrearAsistenciaDto {
  idTrabajador: number;
  idCiclo: number;
  idLabor?: number;
  fechaJornada: string;
  horasTrabajadas: number;
  valorHoraAplicado: number;
}

export interface ActualizarEstadoPagoDto {
  estadoPago: 'PAGADO' | 'PENDIENTE' | 'CONCILIADO';
}

export interface ProrratearCostoIndirectoDto {
  tipoGasto: string;
  comprobanteFactura?: string;
  fechaImputacion: string;
  montoTotalFactura: number;
  criterio: 'SUPERFICIE_M2' | 'EQUITATIVO';
  glosaDetalle?: string;
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

