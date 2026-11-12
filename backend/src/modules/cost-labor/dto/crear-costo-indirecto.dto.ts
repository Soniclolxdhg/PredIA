import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearCostoIndirectoDto {
  @IsInt({ message: 'El id del ciclo debe ser un número entero.' })
  @IsPositive({ message: 'El id del ciclo debe ser positivo.' })
  idCiclo: number;

  @IsString({ message: 'El tipo de gasto debe ser texto.' })
  @IsNotEmpty({ message: 'El tipo de gasto es obligatorio (ej: ELECTRICIDAD_BOMBEO, AGUA_RIEGO, MANTENCION_NAVE).' })
  @MaxLength(50, { message: 'El tipo de gasto no puede exceder 50 caracteres.' })
  tipoGasto: string;

  @IsOptional()
  @IsString({ message: 'El comprobante/factura debe ser texto.' })
  @MaxLength(50, { message: 'El comprobante no puede exceder 50 caracteres.' })
  comprobanteFactura?: string;

  @IsDateString({}, { message: 'La fecha de imputación debe tener formato válido (AAAA-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de imputación es obligatoria.' })
  fechaImputacion: string;

  @IsNumber({}, { message: 'El monto prorrateado debe ser un número.' })
  @IsPositive({ message: 'El monto prorrateado debe ser mayor a 0.' })
  montoTotalProrrateado: number;

  @IsString({ message: 'El criterio de distribución es obligatorio.' })
  @IsNotEmpty({ message: 'El criterio de distribución no puede estar vacío (ej: DIRECTO_CICLO, SUPERFICIE_M2, EQUITATIVO).' })
  @MaxLength(100, { message: 'El criterio de distribución no puede exceder 100 caracteres.' })
  criterioDistribucion: string;

  @IsOptional()
  @IsString({ message: 'La glosa de detalle debe ser texto.' })
  glosaDetalle?: string;
}
