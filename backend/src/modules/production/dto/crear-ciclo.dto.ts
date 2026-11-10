import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO para la validación de apertura de un nuevo Ciclo de Cultivo (HU01).
 * Admite tanto notación camelCase como snake_case para compatibilidad total con frontend y API.
 */
export class CrearCicloDto {
  @IsOptional()
  idNave?: number;

  @IsOptional()
  id_nave?: number;

  @IsString({ message: 'La temporada es obligatoria.' })
  @IsNotEmpty({ message: 'La temporada no puede estar vacía.' })
  temporada: string;

  @IsString({ message: 'La variedad es obligatoria.' })
  @IsNotEmpty({ message: 'La variedad no puede estar vacía.' })
  variedad: string;

  @IsOptional()
  fechaInicio?: string;

  @IsOptional()
  fecha_inicio?: string;

  @IsOptional()
  fechaTerminoEstimada?: string;

  @IsOptional()
  fecha_termino_estimada?: string;
}
