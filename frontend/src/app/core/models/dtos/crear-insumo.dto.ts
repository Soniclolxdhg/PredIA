import { CategoriaInsumo } from '../enum.types';

/**
 * DTO para la creación de un nuevo insumo agrícola en bodega
 */
export interface CrearInsumoDto {
  codigoInsumo: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidadMedida: string;
  stockMinimoAlerta: number;
  stockInicial?: number;
  costoUnitarioInicial?: number;
  esMaterialVegetal?: boolean;
}

