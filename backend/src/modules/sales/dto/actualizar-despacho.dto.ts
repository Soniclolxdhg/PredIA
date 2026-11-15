import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoDespacho } from '@prisma/client';

export class ActualizarDespachoDto {
  @IsEnum(EstadoDespacho, {
    message: 'El estado de despacho debe ser PENDIENTE, DESPACHADO o ENTREGADO.',
  })
  @IsNotEmpty({ message: 'El estado de despacho es obligatorio.' })
  estadoDespacho: EstadoDespacho;
}
