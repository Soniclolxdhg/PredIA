import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoLabor } from '@prisma/client';

export class CrearLaborDto {
  @IsInt({ message: 'El id del ciclo debe ser un número entero.' })
  @IsPositive({ message: 'El id del ciclo debe ser un número positivo.' })
  idCiclo: number;

  @IsEnum(TipoLabor, {
    message: 'El tipo de labor debe ser SIEMBRA, RIEGO, FERTILIZACION, FITOSANITARIO o COSECHA.',
  })
  @IsNotEmpty({ message: 'El tipo de labor es obligatorio.' })
  tipoLabor: TipoLabor;

  @IsDateString({}, { message: 'La fecha de ejecución debe tener formato AAAA-MM-DD.' })
  @IsNotEmpty({ message: 'La fecha de ejecución es obligatoria.' })
  fechaEjecucion: string;

  @IsNumber({}, { message: 'Las horas dedicadas deben ser un número.' })
  @IsPositive({ message: 'Las horas dedicadas deben ser un valor positivo.' })
  horasDedicadas: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones técnicas deben ser texto.' })
  observacionesTecnicas?: string;
}
