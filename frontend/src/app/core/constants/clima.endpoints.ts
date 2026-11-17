export const CLIMA_ENDPOINTS = {
  PRONOSTICO: '/api/clima/pronostico',
  SINCRONIZAR: '/api/clima/sincronizar',
  ALERTAS: '/api/clima/alertas',
  ATENDER_ALERTA: (id: number) => `/api/clima/alertas/${id}/atender`
} as const;
