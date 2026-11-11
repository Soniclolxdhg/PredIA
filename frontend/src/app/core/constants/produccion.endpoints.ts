/**
 * Constantes de Rutas y Endpoints del Módulo de Producción y Campo (HU01, HU02, HU03).
 * Mantiene centralizados los contratos REST con el backend NestJS y la base de datos Supabase.
 */
export const PRODUCCION_ENDPOINTS = {
  // HU01: Naves e Invernaderos
  NAVES: '/produccion/naves',
  NAVE_POR_ID: (id: number) => `/produccion/naves/${id}`,
  SEMBRAR_NAVES: '/produccion/sembrar-naves',

  // HU01: Ciclos de Cultivo
  CICLOS: '/produccion/ciclos',
  CICLO_POR_ID: (id: number) => `/produccion/ciclos/${id}`,
  CERRAR_CICLO: (id: number) => `/produccion/ciclos/${id}/cerrar`,

  // HU02: Labores Agrícolas en Terreno
  LABORES: '/produccion/labores',
  LABORES_POR_CICLO: (idCiclo: number) => `/produccion/ciclos/${idCiclo}/labores`,

  // HU03: Cosechas y Pesaje en Báscula
  COSECHAS: '/produccion/cosechas',
  COSECHAS_POR_CICLO: (idCiclo: number) => `/produccion/ciclos/${idCiclo}/cosechas`,
  COSECHAS_DISPONIBLES: '/produccion/cosechas/disponibles',
} as const;
