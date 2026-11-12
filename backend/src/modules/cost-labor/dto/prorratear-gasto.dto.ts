import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ProrratearGastoDto {
  @IsString({ message: 'El tipo de gasto es obligatorio.' })
  @IsNotEmpty({ message: 'El tipo de gasto no puede estar vacío.' })
  @MaxLength(50, { message: 'El tipo de gasto no puede exceder 50 caracteres.' })
  tipoGasto: string;

  @IsOptional()
  @IsString({ message: 'El comprobante/factura debe ser texto.' })
  @MaxLength(50, { message: 'El comprobante no puede exceder 50 caracteres.' })
  comprobanteFactura?: string;

  @IsDateString({}, { message: 'La fecha de imputación debe ser válida (AAAA-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de imputación es obligatoria.' })
  fechaImputacion: string;

  @IsNumber({}, { message: 'El monto total a prorratear debe ser un número.' })
  @IsPositive({ message: 'El monto total a prorratear debe ser mayor a 0.' })
  montoTotalFactura: number;

  @IsIn(['SUPERFICIE_M2', 'EQUITATIVO'], {
    message: 'El criterio debe ser SUPERFICIE_M2 o EQUITATIVO.',
  })
  criterio: 'SUPERFICIE_M2' | 'EQUITATIVO';

  @IsOptional()
  @IsString({ message: 'La glosa debe ser texto.' })
  glosaDetalle?: string;
}

