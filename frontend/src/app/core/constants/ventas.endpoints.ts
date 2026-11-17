export const VENTAS_ENDPOINTS = {
  CLIENTES: '/ventas/clientes',
  CLIENTE_DETALLE: (id: number) => `/ventas/clientes/${id}`,
  STOCK_DISPONIBLE: '/ventas/stock-disponible',
  NOTAS_VENTA: '/ventas',
  VENTA_DESPACHO: (id: number) => `/ventas/${id}/despacho`,
  METRICAS: '/ventas/metricas'
} as const;

