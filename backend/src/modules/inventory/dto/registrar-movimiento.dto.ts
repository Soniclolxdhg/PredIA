import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoMovimientoBodega } from '@prisma/client';

export class RegistrarMovimientoDto {
  @IsInt({ message: 'El id del insumo debe ser un número entero.' })
  @IsPositive({ message: 'El id del insumo debe ser positivo.' })
  idInsumo: number;

  @IsEnum(TipoMovimientoBodega, {
    message: 'El tipo de movimiento debe ser ENTRADA_COMPRA, SALIDA_LABOR o AJUSTE_MERMA.',
  })
  @IsNotEmpty({ message: 'El tipo de movimiento es obligatorio.' })
  tipoMovimiento: TipoMovimientoBodega;

  @IsNumber({}, { message: 'La cantidad nominal debe ser un número.' })
  @IsPositive({ message: 'La cantidad nominal debe ser mayor a 0.' })
  cantidadNominal: number;

  @IsOptional()
  @IsNumber({}, { message: 'El porcentaje de merma debe ser un valor numérico.' })
  @Min(0, { message: 'El porcentaje de merma no puede ser menor a 0.' })
  @Max(100, { message: 'El porcentaje de merma no puede exceder el 100%.' })
  porcentajeMerma?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El costo unitario de compra debe ser un número.' })
  @Min(0, { message: 'El costo unitario de compra no puede ser negativo.' })
  costoUnitarioCompra?: number;

  @IsOptional()
  @IsInt({ message: 'El id de la labor debe ser un número entero.' })
  @IsPositive({ message: 'El id de la labor debe ser positivo.' })
  idLabor?: number;

  @IsOptional()
  @IsString({ message: 'El documento de referencia debe ser texto.' })
  @MaxLength(50, { message: 'El documento de referencia no puede exceder 50 caracteres.' })
  documentoReferencia?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha del movimiento debe tener formato válido (AAAA-MM-DD).' })
  fechaMovimiento?: string;
}

