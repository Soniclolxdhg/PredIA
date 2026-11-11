/**
 * DTO para el registro de Pesaje de Cosecha en Báscula al Pie de Nave (HU03).
 */
export interface CrearCosechaDto {
  idCiclo: number;
  fechaCosecha: string;
  kilosNetos: number;
  calidadGrado: 'PRIMERA' | 'SEGUNDA' | 'DESCARTE';
}

