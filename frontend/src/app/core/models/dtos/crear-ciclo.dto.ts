/**
 * DTO para la apertura de un nuevo Ciclo de Cultivo (HU01).
 * Valida que la nave destino exista y no cuente con otro ciclo activo.
 */
export interface CrearCicloDto {
  idNave: number;
  temporada: string;
  variedad: string;
  fechaInicio: string;
  fechaTerminoEstimada?: string;
}
