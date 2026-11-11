import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CategoriaInsumo } from '@prisma/client';

export class CrearInsumoDto {
  @IsString({ message: 'El código de insumo debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El código del insumo es obligatorio.' })
  @MaxLength(30, { message: 'El código del insumo no puede exceder 30 caracteres.' })
  codigoInsumo: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del insumo es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres.' })
  nombre: string;

  @IsEnum(CategoriaInsumo, {
    message: 'La categoría debe ser SEMILLA, ALMACIGO, FERTILIZANTE, DESINFECTANTE u OTRO.',
  })
  @IsNotEmpty({ message: 'La categoría del insumo es obligatoria.' })
  categoria: CategoriaInsumo;

  @IsString({ message: 'La unidad de medida es obligatoria.' })
  @IsNotEmpty({ message: 'La unidad de medida no puede estar vacía (ej: KG, LITROS, BANDEJA, UNIDADES).' })
  @MaxLength(20, { message: 'La unidad de medida no puede exceder 20 caracteres.' })
  unidadMedida: string;

  @IsNumber({}, { message: 'El stock mínimo debe ser un número.' })
  @Min(0, { message: 'El stock mínimo de alerta no puede ser negativo.' })
  stockMinimoAlerta: number;

  @IsOptional()
  @IsNumber({}, { message: 'El stock inicial debe ser un número.' })
  @Min(0, { message: 'El stock inicial no puede ser negativo.' })
  stockInicial?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El costo unitario inicial debe ser un número.' })
  @Min(0, { message: 'El costo unitario inicial no puede ser negativo.' })
  costoUnitarioInicial?: number;

  @IsOptional()
  @IsBoolean({ message: 'esMaterialVegetal debe ser un valor booleano (true/false).' })
  esMaterialVegetal?: boolean;
}

