export const CLIMA_ENDPOINTS = {
  PRONOSTICO: '/clima/pronostico',
  SINCRONIZAR: '/clima/sincronizar',
  ALERTAS: '/clima/alertas',
  ATENDER_ALERTA: (id: number) => `/clima/alertas/${id}/atender`
} as const;
