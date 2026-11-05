import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { CalidadGrado } from '@prisma/client';

export class CrearCosechaDto {
  @IsInt({ message: 'El id del ciclo debe ser un número entero.' })
  @IsPositive({ message: 'El id del ciclo debe ser un número positivo.' })
  idCiclo: number;

  @IsDateString({}, { message: 'La fecha de cosecha debe tener formato AAAA-MM-DD.' })
  @IsNotEmpty({ message: 'La fecha de cosecha es obligatoria.' })
  fechaCosecha: string;

  @IsNumber({}, { message: 'Los kilos netos deben ser un valor numérico.' })
  @IsPositive({ message: 'Los kilos netos pesados deben ser mayores a 0.' })
  kilosNetos: number;

  @IsOptional()
  @IsEnum(CalidadGrado, {
    message: 'El grado de calidad debe ser PRIMERA, SEGUNDA o DESCARTE.',
  })
  calidadGrado?: CalidadGrado;

  @IsOptional()
  @IsNumber({}, { message: 'Los kilos disponibles para venta deben ser un valor numérico.' })
  kilosDisponiblesVenta?: number;
}
