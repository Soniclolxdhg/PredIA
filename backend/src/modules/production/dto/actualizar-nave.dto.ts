import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { EstadoNave } from '@prisma/client';

export class ActualizarNaveDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @MaxLength(50, { message: 'El nombre de la nave no puede exceder 50 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsNumber({}, { message: 'La superficie debe ser un valor numérico.' })
  @IsPositive({ message: 'La superficie en m2 debe ser un valor positivo.' })
  superficieM2?: number;

  @IsOptional()
  @IsString({ message: 'El tipo de estructura debe ser texto.' })
  @MaxLength(50, { message: 'El tipo de estructura no puede exceder 50 caracteres.' })
  tipoEstructura?: string;

  @IsOptional()
  @IsEnum(EstadoNave, { message: 'El estado de la nave debe ser DISPONIBLE, EN_CULTIVO o MANTENCION.' })
  estado?: EstadoNave;
}
