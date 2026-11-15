export interface CrearClienteDto {
  rutCliente: string;
  razonSocial: string;
  contactoNombre: string;
  telefono: string;
  email: string;
  direccion: string;
}

export interface ActualizarClienteDto {
  rutCliente?: string;
  razonSocial?: string;
  contactoNombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface EmitirNotaVentaDto {
  idCliente: number;
  idCosecha: number;
  kilosVendidos: number;
  precioUnitarioVenta: number;
  fechaVenta?: string;
  numeroNotaVenta?: string;
  estadoDespacho?: 'PENDIENTE' | 'DESPACHADO' | 'ENTREGADO';
}

export interface ActualizarDespachoDto {
  estadoDespacho: 'PENDIENTE' | 'DESPACHADO' | 'ENTREGADO';
}

export interface StockDisponibleDto {
  idCosecha: number;
  fechaCosecha: string;
  calidadGrado: string;
  kilosNetosTotales: number;
  kilosDisponiblesVenta: number;
  nave?: {
    idNave: number;
    codigoNave: string;
    nombre: string;
  };
  ciclo?: {
    idCiclo: number;
    temporada: string;
    variedad: string;
    estado: string;
    costoUnitarioKg: number;
  };
  costoReferenciaKg: number;
  esCostoProvisorio?: boolean;
}

export interface MetricasVentasDto {
  resumenGlobal: {
    totalNotasVenta: number;
    totalKilosVendidos: number;
    totalIngresosCLP: number;
    totalMargenBrutoCLP: number;
    margenBrutoPromedioPorcentaje: number;
  };
  despachoPorEstado: {
    PENDIENTE: number;
    DESPACHADO: number;
    ENTREGADO: number;
  };
  topClientes?: Array<{
    idCliente: number;
    razonSocial: string;
    rutCliente: string;
    totalComprado: number;
    kilos: number;
    notasVenta: number;
  }>;
}

