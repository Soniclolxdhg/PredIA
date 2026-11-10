import {
  RolUsuario,
  EstadoCiclo,
  TipoLabor,
  CategoriaInsumo,
  TipoMovimiento,
  ModalidadPago
} from './enum.types';

export interface Usuario {
  id_usuario: number;
  nombre_completo: string;
  rut: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface Nave {
  id_nave: number;
  codigo_nave: string;
  nombre: string;
  superficie_m2: number;
  tipo_estructura: string;
  estado: 'DISPONIBLE' | 'EN_CULTIVO' | 'MANTENCION';
}

export interface CicloCultivo {
  id_ciclo: number;
  id_nave: number;
  nave?: Nave;
  temporada: string; // ej. PRIMAVERA_2026, OTONO_2026
  variedad: string;  // ej. Tomate Larga Vida
  fecha_inicio: string;
  fecha_termino_estimada: string;
  fecha_cierre_real?: string;
  estado: EstadoCiclo;
  total_kg_cosechados: number;
  costo_total_acumulado: number;
  costo_unitario_kg: number;
}

export interface LaborAgricola {
  id_labor: number;
  id_ciclo: number;
  id_usuario_responsable: number;
  nombre_responsable?: string;
  tipo_labor: TipoLabor;
  fecha_ejecucion: string;
  horas_dedicadas: number;
  observaciones_tecnicas?: string;
  id_insumo_utilizado?: number;
  cantidad_insumo_utilizado?: number;
}

export interface Insumo {
  id_insumo: number;
  codigo_insumo: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad_medida: string;
  stock_actual: number;
  stock_minimo_alerta: number;
  costo_unitario_promedio: number;
  es_material_vegetal: boolean;
}

export interface MovimientoBodega {
  id_movimiento: number;
  id_insumo: number;
  insumo?: Insumo;
  id_usuario: number;
  id_labor?: number;
  tipo_movimiento: TipoMovimiento;
  fecha_movimiento: string;
  cantidad_nominal: number;
  porcentaje_merma: number; // Porcentaje de pérdida biológica (semillas/almácigos)
  cantidad_neta: number;
  costo_unitario_compra: number;
  monto_total_movimiento: number;
  documento_referencia?: string;
}

export interface AsistenciaJornal {
  id_asistencia: number;
  id_trabajador: number;
  nombre_trabajador?: string;
  id_ciclo: number;
  id_labor?: number;
  fecha_jornada: string;
  horas_trabajadas: number;
  valor_hora_aplicado: number;
  monto_devengado: number;
  modalidad_pago: ModalidadPago;
  estado_pago: 'PENDIENTE' | 'PAGADO';
}

export interface CostoIndirecto {
  id_costo_indirecto: number;
  id_ciclo: number;
  tipo_gasto: 'ELECTRICIDAD_BOMBEO' | 'MANTENCION_NAVE' | 'AGUA_RIEGO';
  comprobante_factura: string;
  fecha_imputacion: string;
  monto_total_prorrateado: number;
  criterio_distribucion: 'SUPERFICIE_M2' | 'EQUITATIVO_CICLOS';
}

export interface Cosecha {
  id_cosecha: number;
  id_ciclo: number;
  id_usuario_pesaje: number;
  fecha_cosecha: string;
  kilos_netos: number;
  calidad_grado: 'PRIMERA' | 'SEGUNDA' | 'DESCARTE';
  kilos_disponibles_venta: number;
}

export interface Cliente {
  id_cliente: number;
  rut_cliente: string;
  razon_social: string;
  contacto_nombre: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface Venta {
  id_venta: number;
  id_cliente: number;
  cliente?: Cliente;
  id_cosecha: number;
  numero_nota_venta: string;
  fecha_venta: string;
  kilos_vendidos: number;
  precio_unitario_venta: number;
  monto_total_ingreso: number;
  costo_unitario_ciclo_ref: number;
  margen_bruto_operativo: number;
  estado_despacho: 'PENDIENTE' | 'DESPACHADO' | 'ENTREGADO';
}

export interface HistoricoClima {
  id_registro_clima: number;
  fecha_pronostico: string;
  temp_minima_c: number;
  temp_maxima_c: number;
  probabilidad_precipitacion_pct: number;
  riesgo_helada: boolean; // Alerta si temp_minima_c < 2°C
  datos_meteorologicos_jsonb?: any;
}

export type EstadoItemChecklist = 'CONFORME' | 'OBSERVADO' | 'NO_CONFORME' | 'PENDIENTE';
export type CategoriaChecklist = 'SANIDAD' | 'RIEGO' | 'ESTRUCTURA' | 'MANEJO' | 'BIOSEGURIDAD';

export interface ItemChecklist {
  id: string;
  categoria: CategoriaChecklist;
  titulo: string;
  descripcion: string;
  estado: EstadoItemChecklist;
}

export interface InspeccionNave {
  id_inspeccion: number;
  id_nave: number;
  codigo_nave: string;
  nombre_nave: string;
  variedad_cultivo: string;
  fecha_inspeccion: string;
  inspector: string;
  porcentaje_cumplimiento: number;
  estado_general: 'APROBADO' | 'CON_OBSERVACIONES' | 'CRITICO';
  observaciones?: string;
  total_conforme: number;
  total_observado: number;
  total_no_conforme: number;
}

