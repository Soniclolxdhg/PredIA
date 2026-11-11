/**
 * DTO para la creación de una Nave o Invernadero (HU01).
 * Espejo del contrato de validación del backend NestJS.
 */
export interface CrearNaveDto {
  codigoNave: string;
  nombre: string;
  superficieM2: number;
  tipoEstructura?: string;
  estado?: 'DISPONIBLE' | 'EN_CULTIVO' | 'MANTENCION';
}

