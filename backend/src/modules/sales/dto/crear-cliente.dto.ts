import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearClienteDto {
  @IsString({ message: 'El RUT del cliente es obligatorio.' })
  @IsNotEmpty({ message: 'El RUT del cliente no puede estar vacío.' })
  @MaxLength(12, { message: 'El RUT no puede exceder 12 caracteres.' })
  rutCliente: string;

  @IsString({ message: 'La razón social es obligatoria.' })
  @IsNotEmpty({ message: 'La razón social no puede estar vacía.' })
  @MaxLength(120, { message: 'La razón social no puede exceder 120 caracteres.' })
  razonSocial: string;

  @IsOptional()
  @IsString({ message: 'El nombre de contacto debe ser texto.' })
  @MaxLength(80, { message: 'El nombre de contacto no puede exceder 80 caracteres.' })
  contactoNombre?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres.' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido.' })
  @MaxLength(100, { message: 'El email no puede exceder 100 caracteres.' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto.' })
  @MaxLength(150, { message: 'La dirección no puede exceder 150 caracteres.' })
  direccion?: string;
}

