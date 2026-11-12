import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CargoTrabajador, ModalidadPago } from '@prisma/client';

export class ActualizarTrabajadorDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto.' })
  @MaxLength(60, { message: 'El nombre no puede exceder 60 caracteres.' })
  nombres?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto.' })
  @MaxLength(60, { message: 'El apellido no puede exceder 60 caracteres.' })
  apellidos?: string;

  @IsOptional()
  @IsEnum(CargoTrabajador, {
    message: 'El cargo debe ser OPERARIO_CAMPO, COSECHADOR, CHOFER o MECANICO.',
  })
  cargo?: CargoTrabajador;

  @IsOptional()
  @IsEnum(ModalidadPago, {
    message: 'La modalidad de pago debe ser DIARIO, SEMANAL, QUINCENAL o MENSUAL.',
  })
  modalidadPago?: ModalidadPago;

  @IsOptional()
  @IsNumber({}, { message: 'La tarifa base debe ser un valor numérico.' })
  @IsPositive({ message: 'La tarifa base debe ser positiva.' })
  tarifaBase?: number;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano.' })
  activo?: boolean;
}

