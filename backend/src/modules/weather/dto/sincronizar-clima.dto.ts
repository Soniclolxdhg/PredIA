import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SincronizarClimaDto {
  @IsOptional()
  @IsNumber({}, { message: 'La latitud debe ser un número decimal.' })
  @Min(-90, { message: 'La latitud no puede ser menor a -90.' })
  @Max(90, { message: 'La latitud no puede ser mayor a 90.' })
  latitud?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser un número decimal.' })
  @Min(-180, { message: 'La longitud no puede ser menor a -180.' })
  @Max(180, { message: 'La longitud no puede ser mayor a 180.' })
  longitud?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Los días de pronóstico deben ser un número.' })
  @Min(1, { message: 'Los días de pronóstico deben ser al menos 1.' })
  @Max(16, { message: 'Open-Meteo soporta hasta 16 días de pronóstico.' })
  diasPronostico?: number;
}

