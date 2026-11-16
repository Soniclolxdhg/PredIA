import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAlerta } from '@prisma/client';

export class AtenderAlertaDto {
  @IsOptional()
  @IsEnum(EstadoAlerta, {
    message: 'El estado de la alerta debe ser ABIERTA o ATENDIDA.',
  })
  estado?: EstadoAlerta;

  @IsOptional()
  @IsString({ message: 'La observación debe ser texto.' })
  @MaxLength(200, { message: 'La observación no puede exceder 200 caracteres.' })
  observacion?: string;
}
