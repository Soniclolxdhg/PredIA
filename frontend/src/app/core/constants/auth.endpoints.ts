/**
 * Constantes de Rutas y Endpoints del Módulo de Autenticación y Usuarios.
 * Conecta con AuthController de NestJS.
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTRO: '/auth/registro',
  PERFIL: '/auth/perfil',
  USUARIOS: '/auth/usuarios',
  USUARIO_POR_ID: (id: number) => `/auth/usuarios/${id}`,
  CONMUTAR_ESTADO: (id: number) => `/auth/usuarios/${id}/estado`,
  CAMBIAR_PASSWORD: (id: number) => `/auth/usuarios/${id}/password`
} as const;

