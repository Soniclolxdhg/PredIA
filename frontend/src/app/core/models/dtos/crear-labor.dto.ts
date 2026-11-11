/**
 * DTO para el registro de Labores Agrícolas en Terreno (HU02).
 */
export interface CrearLaborDto {
  idCiclo: number;
  tipoLabor: 'SIEMBRA' | 'RIEGO' | 'FERTILIZACION' | 'FITOSANITARIO' | 'COSECHA';
  fechaEjecucion: string;
  horasDedicadas: number;
  observacionesTecnicas?: string;
}
