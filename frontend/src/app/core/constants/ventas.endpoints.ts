export const VENTAS_ENDPOINTS = {
  CLIENTES: '/api/ventas/clientes',
  CLIENTE_DETALLE: (id: number) => `/api/ventas/clientes/${id}`,
  STOCK_DISPONIBLE: '/api/ventas/stock-disponible',
  NOTAS_VENTA: '/api/ventas',
  VENTA_DESPACHO: (id: number) => `/api/ventas/${id}/despacho`,
  METRICAS: '/api/ventas/metricas'
} as const;

