import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class RegistroDto {
  @IsString({ message: 'El nombre completo es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre completo no puede estar vacío.' })
  nombreCompleto: string;

  @IsString({ message: 'El RUT es obligatorio.' })
  @IsNotEmpty({ message: 'El RUT no puede estar vacío.' })
  rut: string;

  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  @IsOptional()
  @IsEnum(RolUsuario, { message: 'El rol especificado no es válido.' })
  rol?: RolUsuario;
}

