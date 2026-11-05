import { IsDateString, IsOptional } from 'class-validator';

export class CerrarCicloDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cierre real debe tener formato AAAA-MM-DD.' })
  fechaCierreReal?: string;
}
