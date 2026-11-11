import { CategoriaInsumo } from '../enum.types';

/**
 * DTO para la actualización de parámetros de un insumo existente
 */
export interface ActualizarInsumoDto {
  nombre?: string;
  categoria?: CategoriaInsumo;
  unidadMedida?: string;
  stockMinimoAlerta?: number;
  esMaterialVegetal?: boolean;
}
