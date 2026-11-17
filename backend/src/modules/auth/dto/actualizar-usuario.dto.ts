import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString({ message: 'El nombre completo debe ser texto.' })
  nombreCompleto?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'El RUT debe ser texto.' })
  rut?: string;

  @IsOptional()
  @IsEnum(RolUsuario, { message: 'El rol especificado no es válido.' })
  rol?: RolUsuario;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un valor booleano (true o false).' })
  activo?: boolean;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres si se modifica.' })
  password?: string;
}
