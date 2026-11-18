import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActualizarUnidadDto {
  @IsOptional()
  @IsString({ message: 'El código debe ser texto.' })
  @MaxLength(20, { message: 'El código no puede exceder 20 caracteres.' })
  codigo?: string;

  @IsOptional()
  @IsString({ message: 'El nombre de la unidad debe ser texto.' })
  @MaxLength(50, { message: 'El nombre de la unidad no puede exceder 50 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'El símbolo o abreviatura debe ser texto.' })
  @MaxLength(20, { message: 'El símbolo no puede exceder 20 caracteres.' })
  simbolo?: string;

  @IsOptional()
  @IsString({ message: 'La magnitud debe ser texto.' })
  @MaxLength(30, { message: 'La magnitud no puede exceder 30 caracteres.' })
  magnitud?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un valor booleano (true o false).' })
  activo?: boolean;
}
