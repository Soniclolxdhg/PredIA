import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para la creación de una Nave o Invernadero (HU01).
 * Corresponde a los campos de la tabla 'naves' en Supabase.
 * Admite tanto camelCase como snake_case para máxima compatibilidad con el frontend.
 */
export class CrearNaveDto {
  @IsOptional()
  codigoNave?: string;

  @IsOptional()
  codigo_nave?: string;

  @IsString({ message: 'El nombre de la nave es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre de la nave no puede estar vacío.' })
  nombre: string;

  @IsOptional()
  superficieM2?: number;

  @IsOptional()
  superficie_m2?: number;

  @IsOptional()
  tipoEstructura?: string;

  @IsOptional()
  tipo_estructura?: string;
}
