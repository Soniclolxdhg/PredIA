import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { EstadoDespacho } from '@prisma/client';

export class EmitirNotaVentaDto {
  @IsInt({ message: 'El ID del cliente debe ser un número entero.' })
  @IsPositive({ message: 'El ID del cliente debe ser positivo.' })
  @IsNotEmpty({ message: 'El ID del cliente es obligatorio.' })
  idCliente: number;

  @IsInt({ message: 'El ID del lote de cosecha debe ser un número entero.' })
  @IsPositive({ message: 'El ID del lote de cosecha debe ser positivo.' })
  @IsNotEmpty({ message: 'El ID del lote de cosecha es obligatorio.' })
  idCosecha: number;

  @IsNumber({}, { message: 'Los kilos vendidos deben ser un valor numérico.' })
  @IsPositive({ message: 'Los kilos vendidos deben ser mayores a cero.' })
  @IsNotEmpty({ message: 'Los kilos vendidos son obligatorios.' })
  kilosVendidos: number;

  @IsNumber({}, { message: 'El precio unitario de venta ($/Kg) debe ser numérico.' })
  @IsPositive({ message: 'El precio unitario de venta ($/Kg) debe ser positivo.' })
  @IsNotEmpty({ message: 'El precio unitario de venta es obligatorio.' })
  precioUnitarioVenta: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de venta debe ser una fecha válida (YYYY-MM-DD).' })
  fechaVenta?: string;

  @IsOptional()
  @IsString({ message: 'El número de nota de venta debe ser texto.' })
  @MaxLength(30, { message: 'El número de nota de venta no puede exceder 30 caracteres.' })
  numeroNotaVenta?: string;

  @IsOptional()
  @IsEnum(EstadoDespacho, {
    message: 'El estado de despacho debe ser PENDIENTE, DESPACHADO o ENTREGADO.',
  })
  estadoDespacho?: EstadoDespacho;
}
