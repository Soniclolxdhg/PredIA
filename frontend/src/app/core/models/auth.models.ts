import { RolUsuario } from './enum.types';
import { Usuario } from './erp.models';

export * from './enum.types';
export * from './erp.models';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: {
    idUsuario?: number;
    id_usuario?: number;
    nombreCompleto?: string;
    nombre_completo?: string;
    email: string;
    rut: string;
    rol: RolUsuario;
    activo?: boolean;
  };
}

export interface ErrorApi {
  statusCode: number;
  message: string | string[];
  error?: string;
}
