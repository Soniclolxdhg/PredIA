import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

/**
 * DTO para la creación de una Nave o Invernadero.
 * Corresponde a los campos de la tabla 'naves' en Supabase.
 */
export class CrearNaveDto {
  @IsString({ message: 'El código de la nave es obligatorio.' })
  @IsNotEmpty({ message: 'El código de la nave no puede estar vacío.' })
  codigoNave: string;

  @IsString({ message: 'El nombre de la nave es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre de la nave no puede estar vacío.' })
  nombre: string;

  @IsNumber({}, { message: 'La superficie en m² debe ser un número válido.' })
  @IsNotEmpty({ message: 'La superficie en m² es obligatoria.' })
  superficieM2: number;

  @IsString({ message: 'El tipo de estructura debe ser una cadena de texto.' })
  @IsOptional()
  tipoEstructura?: string;
}
