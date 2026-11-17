export const COSTOS_ENDPOINTS = {
  ASISTENCIAS: '/costos/asistencias',
  ESTADO_PAGO: (id: number) => `/costos/asistencias/${id}/estado-pago`,
  INDIRECTOS_PRORRATEAR: '/costos/indirectos/prorratear',
  LIQUIDACION: (idCiclo: number) => `/costos/liquidacion/${idCiclo}`,
  CONSOLIDAR: (idCiclo: number) => `/costos/liquidacion/${idCiclo}/consolidar`
} as const;

