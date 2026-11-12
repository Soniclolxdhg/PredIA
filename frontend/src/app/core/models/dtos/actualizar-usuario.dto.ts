import { RolUsuario } from '../enum.types';

/**
 * DTO para la actualización de datos de un usuario existente (HU Administración).
 */
export interface ActualizarUsuarioDto {
  nombreCompleto?: string;
  email?: string;
  rol?: RolUsuario;
  activo?: boolean;
}

export interface CambiarPasswordAdminDto {
  nuevaPassword: string;
}
