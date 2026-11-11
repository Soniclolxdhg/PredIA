/**
 * Constantes de Rutas y Endpoints del Módulo de Autenticación y Usuarios.
 * Conecta con AuthController de NestJS.
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTRO: '/auth/registro',
  PERFIL: '/auth/perfil',
  USUARIOS: '/auth/usuarios'
} as const;

