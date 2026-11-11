/**
 * Constantes de rutas y endpoints para el Módulo de Inventario y Bodega (HU04, HU05).
 * Conexión centralizada con la API REST de PredIA en NestJS.
 */
export const INVENTARIO_ENDPOINTS = {
  INSUMOS: '/inventario/insumos',
  INSUMO_POR_ID: (id: number) => `/inventario/insumos/${id}`,
  MOVIMIENTOS: '/inventario/movimientos',
  ALERTAS: '/inventario/alertas',
  ATENDER_ALERTA: (id: number) => `/inventario/alertas/${id}/atender`
} as const;
