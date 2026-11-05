import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { EstadoNave } from '@prisma/client';

export class CrearNaveDto {
  @IsString({ message: 'El código de nave debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El código de la nave es obligatorio.' })
  @MaxLength(20, { message: 'El código de nave no puede exceder 20 caracteres.' })
  codigoNave: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre de la nave es obligatorio.' })
  @MaxLength(50, { message: 'El nombre de la nave no puede exceder 50 caracteres.' })
  nombre: string;

  @IsNumber({}, { message: 'La superficie debe ser un valor numérico.' })
  @IsPositive({ message: 'La superficie en m2 debe ser un valor positivo.' })
  superficieM2: number;

  @IsOptional()
  @IsString({ message: 'El tipo de estructura debe ser texto.' })
  @MaxLength(50, { message: 'El tipo de estructura no puede exceder 50 caracteres.' })
  tipoEstructura?: string;

  @IsOptional()
  @IsEnum(EstadoNave, { message: 'El estado de la nave debe ser DISPONIBLE, EN_CULTIVO o MANTENCION.' })
  estado?: EstadoNave;
}
