import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CrearUnidadDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto.' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres.' })
  codigo?: string;

  @IsString({ message: 'El nombre de la unidad es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre de la unidad no puede estar vacío.' })
  @MaxLength(50, { message: 'El nombre de la unidad no puede exceder 50 caracteres.' })
  nombre: string;

  @IsString({ message: 'El símbolo o abreviatura es obligatorio.' })
  @IsNotEmpty({ message: 'El símbolo o abreviatura no puede estar vacío.' })
  @MaxLength(20, { message: 'El símbolo no puede exceder 20 caracteres.' })
  simbolo: string;

  @IsString({ message: 'La magnitud o tipo (ej. MASA, VOLUMEN, CANTIDAD) es obligatoria.' })
  @IsNotEmpty({ message: 'La magnitud no puede estar vacía.' })
  @MaxLength(30, { message: 'La magnitud no puede exceder 30 caracteres.' })
  magnitud: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un valor booleano (true o false).' })
  activo?: boolean;
}
