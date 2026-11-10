import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CrearCicloDto {
  @IsInt({ message: 'El id de la nave debe ser un número entero.' })
  @IsPositive({ message: 'El id de la nave debe ser un número positivo.' })
  idNave: number;

  @IsString({ message: 'La temporada debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La temporada es obligatoria (ej: PRIMAVERA_2026, OTONO_2026).' })
  @MaxLength(20, { message: 'La temporada no puede exceder 20 caracteres.' })
  temporada: string;

  @IsString({ message: 'La variedad es obligatoria.' })
  @IsNotEmpty({ message: 'La variedad cultivada no puede estar vacía.' })
  @MaxLength(50, { message: 'La variedad no puede exceder 50 caracteres.' })
  variedad: string;

  @IsDateString({}, { message: 'La fecha de inicio debe tener formato de fecha válido (AAAA-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de inicio del ciclo es obligatoria.' })
  fechaInicio: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha estimada de término debe tener formato de fecha válido (AAAA-MM-DD).' })
  fechaTerminoEstimada?: string;
}

