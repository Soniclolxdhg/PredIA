export type RolUsuario = 'ADMINISTRADOR' | 'AGRONOMO' | 'BODEGUERO' | 'GERENTE';

export interface UsuarioSesion {
  idUsuario: number;
  nombreCompleto: string;
  email: string;
  rut: string;
  rol: RolUsuario;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioSesion;
}

export interface ErrorApi {
  statusCode: number;
  message: string | string[];
  error?: string;
}

