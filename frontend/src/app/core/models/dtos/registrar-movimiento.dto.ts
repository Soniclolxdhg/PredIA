import { TipoMovimiento } from '../enum.types';

/**
 * DTO para registrar un movimiento en el Kardex (HU04).
 * Soporta entradas por compra con merma porcentual y salidas a labor en terreno.
 */
export interface RegistrarMovimientoDto {
  idInsumo: number;
  tipoMovimiento: TipoMovimiento;
  cantidadNominal: number;
  porcentajeMerma?: number;
  costoUnitarioCompra?: number;
  idLabor?: number;
  documentoReferencia?: string;
  fechaMovimiento?: string;
}

