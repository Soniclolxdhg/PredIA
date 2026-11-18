import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActualizarVariedadDto {
  @IsOptional()
  @IsString({ message: 'El nombre de la variedad debe ser texto.' })
  @MaxLength(50, { message: 'El nombre de la variedad no puede exceder 50 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'La especie debe ser texto.' })
  @MaxLength(50, { message: 'La especie no puede exceder 50 caracteres.' })
  especie?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(200, { message: 'La descripción no puede exceder 200 caracteres.' })
  descripcion?: string;

  @IsOptional()
  @IsBoolean({ message: 'activo debe ser un valor booleano (true o false).' })
  activo?: boolean;
}
