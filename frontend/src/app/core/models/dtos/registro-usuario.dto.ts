import { RolUsuario } from '../auth.models';

/**
 * DTO para el registro de nuevos usuarios en el sistema.
 * Espejo del contrato de validación de backend NestJS (RegistroDto).
 */
export interface RegistroUsuarioDto {
  nombreCompleto: string;
  rut: string;
  email: string;
  password: string;
  rol?: RolUsuario;
}
