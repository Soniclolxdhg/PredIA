import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearEstructuraDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto.' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres.' })
  codigo?: string;

  @IsString({ message: 'El nombre del tipo de estructura es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre del tipo de estructura no puede estar vacío.' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres.' })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'La descripción técnica debe ser texto.' })
  @MaxLength(250, { message: 'La descripción técnica no puede exceder 250 caracteres.' })
  descripcion?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un valor booleano (true o false).' })
  activo?: boolean;
}
