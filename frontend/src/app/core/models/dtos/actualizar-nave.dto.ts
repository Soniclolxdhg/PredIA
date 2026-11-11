/**
 * DTO para la actualización de una Nave existente.
 */
export interface ActualizarNaveDto {
  nombre?: string;
  superficieM2?: number;
  tipoEstructura?: string;
  estado?: 'DISPONIBLE' | 'EN_CULTIVO' | 'MANTENCION';
}
