import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoriaInsumo } from '@prisma/client';

export class ActualizarInsumoDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsEnum(CategoriaInsumo, {
    message: 'La categoría debe ser SEMILLA, ALMACIGO, FERTILIZANTE, DESINFECTANTE u OTRO.',
  })
  categoria?: CategoriaInsumo;

  @IsOptional()
  @IsString({ message: 'La unidad de medida es texto.' })
  @MaxLength(20, { message: 'La unidad de medida no puede exceder 20 caracteres.' })
  unidadMedida?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El stock mínimo debe ser un número.' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  stockMinimoAlerta?: number;

  @IsOptional()
  @IsBoolean({ message: 'esMaterialVegetal debe ser booleano.' })
  esMaterialVegetal?: boolean;
}
