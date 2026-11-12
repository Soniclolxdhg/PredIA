import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CargoTrabajador, ModalidadPago } from '@prisma/client';

export class CrearTrabajadorDto {
  @IsString({ message: 'El RUT es obligatorio.' })
  @IsNotEmpty({ message: 'El RUT no puede estar vacío.' })
  @MaxLength(12, { message: 'El RUT no puede exceder 12 caracteres.' })
  rut: string;

  @IsString({ message: 'El nombre es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  @MaxLength(60, { message: 'El nombre no puede exceder 60 caracteres.' })
  nombres: string;

  @IsString({ message: 'El apellido es obligatorio.' })
  @IsNotEmpty({ message: 'El apellido no puede estar vacío.' })
  @MaxLength(60, { message: 'El apellido no puede exceder 60 caracteres.' })
  apellidos: string;

  @IsEnum(CargoTrabajador, {
    message: 'El cargo debe ser OPERARIO_CAMPO, COSECHADOR, CHOFER o MECANICO.',
  })
  @IsNotEmpty({ message: 'El cargo es obligatorio.' })
  cargo: CargoTrabajador;

  @IsEnum(ModalidadPago, {
    message: 'La modalidad de pago debe ser DIARIO, SEMANAL, QUINCENAL o MENSUAL.',
  })
  @IsNotEmpty({ message: 'La modalidad de pago es obligatoria.' })
  modalidadPago: ModalidadPago;

  @IsNumber({}, { message: 'La tarifa base debe ser un valor numérico.' })
  @IsPositive({ message: 'La tarifa base debe ser positiva.' })
  tarifaBase: number;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser booleano.' })
  activo?: boolean;
}
