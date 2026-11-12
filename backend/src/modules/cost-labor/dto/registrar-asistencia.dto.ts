import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { EstadoPago } from '@prisma/client';

export class RegistrarAsistenciaDto {
  @IsInt({ message: 'El id del trabajador debe ser un número entero.' })
  @IsPositive({ message: 'El id del trabajador debe ser positivo.' })
  idTrabajador: number;

  @IsInt({ message: 'El id del ciclo debe ser un número entero.' })
  @IsPositive({ message: 'El id del ciclo debe ser positivo.' })
  idCiclo: number;

  @IsOptional()
  @IsInt({ message: 'El id de la labor debe ser un número entero.' })
  @IsPositive({ message: 'El id de la labor debe ser positivo.' })
  idLabor?: number;

  @IsDateString({}, { message: 'La fecha de la jornada debe tener formato válido (AAAA-MM-DD).' })
  @IsNotEmpty({ message: 'La fecha de la jornada es obligatoria.' })
  fechaJornada: string;

  @IsNumber({}, { message: 'Las horas trabajadas deben ser un valor numérico.' })
  @Min(0.5, { message: 'Las horas trabajadas mínimas son 0.5.' })
  @Max(24, { message: 'Las horas trabajadas no pueden exceder 24 horas en una jornada.' })
  horasTrabajadas: number;

  @IsOptional()
  @IsNumber({}, { message: 'El valor hora aplicado debe ser un número.' })
  @IsPositive({ message: 'El valor hora aplicado debe ser positivo.' })
  valorHoraAplicado?: number;

  @IsOptional()
  @IsEnum(EstadoPago, {
    message: 'El estado de pago debe ser PENDIENTE, PAGADO o CONCILIADO.',
  })
  estadoPago?: EstadoPago;
}
