export const COSTOS_ENDPOINTS = {
  ASISTENCIAS: '/api/costos/asistencias',
  ESTADO_PAGO: (id: number) => `/api/costos/asistencias/${id}/estado-pago`,
  INDIRECTOS_PRORRATEAR: '/api/costos/indirectos/prorratear',
  LIQUIDACION: (idCiclo: number) => `/api/costos/liquidacion/${idCiclo}`,
  CONSOLIDAR: (idCiclo: number) => `/api/costos/liquidacion/${idCiclo}/consolidar`
} as const;

