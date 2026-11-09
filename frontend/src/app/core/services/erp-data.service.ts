import { Injectable, computed, signal } from '@angular/core';
import {
  Nave,
  CicloCultivo,
  LaborAgricola,
  Insumo,
  MovimientoBodega,
  AsistenciaJornal,
  CostoIndirecto,
  Cosecha,
  Cliente,
  Venta
} from '../models/erp.models';

const STORAGE_PREFIX = 'predia_erp_';

@Injectable({
  providedIn: 'root'
})
export class ErpDataService {
  // 1. Naves e Invernaderos
  readonly naves = signal<Nave[]>(this.cargarInitial('naves', this.getNavesDefault));

  // 2. Ciclos de Cultivo (HU01)
  readonly ciclos = signal<CicloCultivo[]>(this.cargarInitial('ciclos', this.getCiclosDefault));

  // 3. Labores Agrícolas en Terreno (HU02)
  readonly labores = signal<LaborAgricola[]>(this.cargarInitial('labores', this.getLaboresDefault));

  // 4. Cosechas y Pesaje (HU03)
  readonly cosechas = signal<Cosecha[]>(this.cargarInitial('cosechas', this.getCosechasDefault));

  // 5. Insumos y Bodega (HU04)
  readonly insumos = signal<Insumo[]>(this.cargarInitial('insumos', this.getInsumosDefault));

  // 6. Kardex y Mermas (HU04)
  readonly movimientosBodega = signal<MovimientoBodega[]>(
    this.cargarInitial('movimientos', this.getMovimientosDefault)
  );

  // 7. Asistencia y Jornales (HU06)
  readonly asistencias = signal<AsistenciaJornal[]>(
    this.cargarInitial('asistencias', this.getAsistenciasDefault)
  );

  // 8. Costos Indirectos (HU07)
  readonly costosIndirectos = signal<CostoIndirecto[]>(
    this.cargarInitial('indirectos', this.getCostosIndirectosDefault)
  );

  // 9. Directorio Clientes (HU08)
  readonly clientes = signal<Cliente[]>(this.cargarInitial('clientes', this.getClientesDefault));

  // 10. Notas de Venta (HU10)
  readonly ventas = signal<Venta[]>(this.cargarInitial('ventas', this.getVentasDefault));

  // Señales reactivas computadas para KPIs agronómicos y financieros
  readonly insumosCriticos = computed(() =>
    this.insumos().filter((i) => i.stock_actual <= i.stock_minimo_alerta)
  );

  // Lista de ciclos que se encuentran actualmente en estado ACTIVO
  readonly ciclosActivos = computed(() =>
    this.ciclos().filter((c) => c.estado === 'ACTIVO')
  );

  // Consolidado de costos globales y costo unitario $/Kg
  readonly kpisFinancieros = computed(() => {
    const totalKg = this.ciclos().reduce((acc, c) => acc + c.total_kg_cosechados, 0);
    const totalCostos = this.ciclos().reduce((acc, c) => acc + c.costo_total_acumulado, 0);
    const costoPromedioKg = totalKg > 0 ? totalCostos / totalKg : 485.5;

    const totalVentas = this.ventas().reduce((acc, v) => acc + v.monto_total_ingreso, 0);
    const margenBrutoTotal = this.ventas().reduce((acc, v) => acc + v.margen_bruto_operativo, 0);
    const margenPct = totalVentas > 0 ? (margenBrutoTotal / totalVentas) * 100 : 38.5;

    return {
      totalKgCosechados: totalKg,
      totalCostosAcumulados: totalCostos,
      costoPromedioKg: Math.round(costoPromedioKg * 100) / 100,
      totalVentasMonto: totalVentas,
      margenBrutoTotal: margenBrutoTotal,
      margenPorcentaje: Math.round(margenPct * 10) / 10
    };
  });

  // Métodos de negocio y operaciones sobre los datos agrícolas

  /**
   * HU01: Apertura de nuevo ciclo.
   * Regla de negocio: Impedir la apertura si la nave ya tiene un ciclo ACTIVO.
   */
  crearCicloCultivo(dto: {
    id_nave: number;
    temporada: string;
    variedad: string;
    fecha_inicio: string;
    fecha_termino_estimada: string;
  }): { exito: boolean; mensaje: string } {
    const nave = this.naves().find((n) => n.id_nave === Number(dto.id_nave));
    if (!nave) return { exito: false, mensaje: 'La nave seleccionada no existe.' };

    const cicloActivoExistente = this.ciclos().find(
      (c) => c.id_nave === Number(dto.id_nave) && c.estado === 'ACTIVO'
    );

    if (cicloActivoExistente) {
      return {
        exito: false,
        mensaje: `La nave ${nave.nombre} (${nave.codigo_nave}) ya tiene el ciclo activo #${cicloActivoExistente.id_ciclo} (${cicloActivoExistente.variedad}). Debe finalizarlo antes de abrir uno nuevo.`
      };
    }

    const nuevoCiclo: CicloCultivo = {
      id_ciclo: this.ciclos().length + 1,
      id_nave: Number(dto.id_nave),
      nave: nave,
      temporada: dto.temporada,
      variedad: dto.variedad,
      fecha_inicio: dto.fecha_inicio,
      fecha_termino_estimada: dto.fecha_termino_estimada,
      estado: 'ACTIVO',
      total_kg_cosechados: 0,
      costo_total_acumulado: 0,
      costo_unitario_kg: 0
    };

    // Actualizamos el estado de la nave a EN_CULTIVO
    this.naves.update((lista) =>
      lista.map((n) => (n.id_nave === dto.id_nave ? { ...n, estado: 'EN_CULTIVO' } : n))
    );

    this.ciclos.update((lista) => [nuevoCiclo, ...lista]);
    this.persistir('ciclos', this.ciclos());
    this.persistir('naves', this.naves());

    return { exito: true, mensaje: 'Ciclo de cultivo aperturado exitosamente.' };
  }

  /**
   * HU02: Registro de Labor en Terreno con descuento opcional de insumos de bodega
   */
  registrarLabor(labor: Omit<LaborAgricola, 'id_labor'>): void {
    const nuevaLabor: LaborAgricola = {
      ...labor,
      id_labor: this.labores().length + 1
    };

    // Si consumió insumo, descontar de bodega
    if (labor.id_insumo_utilizado && labor.cantidad_insumo_utilizado) {
      this.descontarStockInsumo(
        labor.id_insumo_utilizado,
        labor.cantidad_insumo_utilizado,
        nuevaLabor.id_labor
      );
    }

    // Sumar costo de labor estimado al ciclo
    const costoEstimadoLabor = labor.horas_dedicadas * 4500; // $4.500/hora promedio
    this.imputarCostoACiclo(labor.id_ciclo, costoEstimadoLabor);

    this.labores.update((lista) => [nuevaLabor, ...lista]);
    this.persistir('labores', this.labores());
  }

  /**
   * HU03: Registro rápido de Cosecha al pie de nave
   */
  registrarCosecha(cosecha: Omit<Cosecha, 'id_cosecha' | 'kilos_disponibles_venta'>): void {
    const nueva: Cosecha = {
      ...cosecha,
      id_cosecha: this.cosechas().length + 1,
      kilos_disponibles_venta: cosecha.kilos_netos
    };

    // Actualizar kilos cosechados en el ciclo y recalcular $/Kg
    this.ciclos.update((lista) =>
      lista.map((c) => {
        if (c.id_ciclo === cosecha.id_ciclo) {
          const nuevosKg = c.total_kg_cosechados + cosecha.kilos_netos;
          const nuevoCostoKg = nuevosKg > 0 ? c.costo_total_acumulado / nuevosKg : 0;
          return {
            ...c,
            total_kg_cosechados: nuevosKg,
            costo_unitario_kg: Math.round(nuevoCostoKg * 100) / 100
          };
        }
        return c;
      })
    );

    this.cosechas.update((lista) => [nueva, ...lista]);
    this.persistir('cosechas', this.cosechas());
    this.persistir('ciclos', this.ciclos());
  }

  /**
   * HU04: Registro de Movimiento en Kardex con Merma Biológica
   * Fórmula: cantidad_neta = cantidad_nominal * (1 - (porcentaje_merma / 100))
   */
  registrarMovimientoKardex(
    mov: Omit<MovimientoBodega, 'id_movimiento' | 'cantidad_neta' | 'monto_total_movimiento'>
  ): void {
    const factorMerma = mov.porcentaje_merma > 0 ? mov.porcentaje_merma / 100 : 0;
    const cantidadNeta = Math.round(mov.cantidad_nominal * (1 - factorMerma) * 100) / 100;
    const montoTotal = Math.round(cantidadNeta * mov.costo_unitario_compra);

    const nuevo: MovimientoBodega = {
      ...mov,
      id_movimiento: this.movimientosBodega().length + 1,
      cantidad_neta: cantidadNeta,
      monto_total_movimiento: montoTotal
    };

    // Actualizar stock del insumo correspondiente
    this.insumos.update((lista) =>
      lista.map((ins) => {
        if (ins.id_insumo === mov.id_insumo) {
          const delta =
            mov.tipo_movimiento === 'ENTRADA_COMPRA'
              ? cantidadNeta
              : -cantidadNeta;
          const nuevoStock = Math.max(0, Math.round((ins.stock_actual + delta) * 100) / 100);
          return { ...ins, stock_actual: nuevoStock };
        }
        return ins;
      })
    );

    this.movimientosBodega.update((lista) => [nuevo, ...lista]);
    this.persistir('movimientos', this.movimientosBodega());
    this.persistir('insumos', this.insumos());
  }

  /**
   * HU06: Registro de Asistencia y Jornal
   */
  registrarAsistencia(asistencia: Omit<AsistenciaJornal, 'id_asistencia' | 'monto_devengado'>): void {
    const monto = Math.round(asistencia.horas_trabajadas * asistencia.valor_hora_aplicado);
    const nueva: AsistenciaJornal = {
      ...asistencia,
      id_asistencia: this.asistencias().length + 1,
      monto_devengado: monto
    };

    this.imputarCostoACiclo(asistencia.id_ciclo, monto);
    this.asistencias.update((l) => [nueva, ...l]);
    this.persistir('asistencias', this.asistencias());
  }

  /**
   * HU07: Imputación de Costos Indirectos (Luz/Bombeo, Agua, Mantención)
   */
  registrarCostoIndirecto(costo: Omit<CostoIndirecto, 'id_costo_indirecto'>): void {
    const nuevo: CostoIndirecto = {
      ...costo,
      id_costo_indirecto: this.costosIndirectos().length + 1
    };

    this.imputarCostoACiclo(costo.id_ciclo, costo.monto_total_prorrateado);
    this.costosIndirectos.update((l) => [nuevo, ...l]);
    this.persistir('indirectos', this.costosIndirectos());
  }

  /**
   * HU08: Registro de Nuevo Cliente
   */
  registrarCliente(cliente: Omit<Cliente, 'id_cliente'>): void {
    const nuevo: Cliente = {
      ...cliente,
      id_cliente: this.clientes().length + 1
    };
    this.clientes.update((l) => [nuevo, ...l]);
    this.persistir('clientes', this.clientes());
  }

  /**
   * HU10: Generación de Nota de Venta con verificación de disponibilidad de kilos
   */
  generarNotaVenta(dto: {
    id_cliente: number;
    id_cosecha: number;
    kilos_vendidos: number;
    precio_unitario_venta: number;
  }): { exito: boolean; mensaje: string } {
    const cosecha = this.cosechas().find((c) => c.id_cosecha === Number(dto.id_cosecha));
    if (!cosecha) return { exito: false, mensaje: 'Lote de cosecha no encontrado.' };

    if (cosecha.kilos_disponibles_venta < dto.kilos_vendidos) {
      return {
        exito: false,
        mensaje: `Disponibilidad insuficiente. El lote seleccionado solo dispone de ${cosecha.kilos_disponibles_venta} Kg.`
      };
    }

    const ciclo = this.ciclos().find((c) => c.id_ciclo === cosecha.id_ciclo);
    const costoRef = ciclo?.costo_unitario_kg || 420;

    const totalIngreso = Math.round(dto.kilos_vendidos * dto.precio_unitario_venta);
    const margenBruto = Math.round((dto.precio_unitario_venta - costoRef) * dto.kilos_vendidos);

    const nuevaVenta: Venta = {
      id_venta: this.ventas().length + 1,
      id_cliente: Number(dto.id_cliente),
      cliente: this.clientes().find((cli) => cli.id_cliente === Number(dto.id_cliente)),
      id_cosecha: Number(dto.id_cosecha),
      numero_nota_venta: `NV-2026-${String(this.ventas().length + 1).padStart(4, '0')}`,
      fecha_venta: new Date().toISOString().split('T')[0],
      kilos_vendidos: dto.kilos_vendidos,
      precio_unitario_venta: dto.precio_unitario_venta,
      monto_total_ingreso: totalIngreso,
      costo_unitario_ciclo_ref: costoRef,
      margen_bruto_operativo: margenBruto,
      estado_despacho: 'PENDIENTE'
    };

    // Descontar kilos de la cosecha
    this.cosechas.update((lista) =>
      lista.map((c) =>
        c.id_cosecha === dto.id_cosecha
          ? { ...c, kilos_disponibles_venta: c.kilos_disponibles_venta - dto.kilos_vendidos }
          : c
      )
    );

    this.ventas.update((l) => [nuevaVenta, ...l]);
    this.persistir('ventas', this.ventas());
    this.persistir('cosechas', this.cosechas());

    return { exito: true, mensaje: `Nota de venta ${nuevaVenta.numero_nota_venta} emitida correctamente.` };
  }

  private descontarStockInsumo(idInsumo: number, cantidad: number, idLabor: number): void {
    const insumo = this.insumos().find((i) => i.id_insumo === idInsumo);
    if (!insumo) return;

    this.registrarMovimientoKardex({
      id_insumo: idInsumo,
      id_usuario: 2,
      id_labor: idLabor,
      tipo_movimiento: 'SALIDA_LABOR',
      fecha_movimiento: new Date().toISOString().split('T')[0],
      cantidad_nominal: cantidad,
      porcentaje_merma: 0,
      costo_unitario_compra: insumo.costo_unitario_promedio,
      documento_referencia: `Labor #${idLabor}`
    });
  }

  private imputarCostoACiclo(idCiclo: number, costoAdicional: number): void {
    this.ciclos.update((lista) =>
      lista.map((c) => {
        if (c.id_ciclo === idCiclo) {
          const nuevoTotal = c.costo_total_acumulado + costoAdicional;
          const nuevoCostoKg = c.total_kg_cosechados > 0 ? nuevoTotal / c.total_kg_cosechados : 0;
          return {
            ...c,
            costo_total_acumulado: nuevoTotal,
            costo_unitario_kg: Math.round(nuevoCostoKg * 100) / 100
          };
        }
        return c;
      })
    );
    this.persistir('ciclos', this.ciclos());
  }

  // Persistencia en almacenamiento local y registros iniciales

  private cargarInitial<T>(key: string, factory: () => T): T {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) {
      const data = factory();
      this.persistir(key, data);
      return data;
    }
    try {
      return JSON.parse(item);
    } catch {
      return factory();
    }
  }

  private persistir<T>(key: string, val: T): void {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  }

  // Datos base para inicialización del sistema en ausencia de conexión remota
  private getNavesDefault(): Nave[] {
    return [
      { id_nave: 1, codigo_nave: 'NAV-01', nombre: 'Nave Central Tomates', superficie_m2: 2500, tipo_estructura: 'Multitúnel Metal', estado: 'EN_CULTIVO' },
      { id_nave: 2, codigo_nave: 'NAV-02', nombre: 'Nave Pimientos Holandeses', superficie_m2: 2000, tipo_estructura: 'Túnel Simple', estado: 'EN_CULTIVO' },
      { id_nave: 3, codigo_nave: 'NAV-03', nombre: 'Nave Almácigos y Propagación', superficie_m2: 1200, tipo_estructura: 'Invernadero Climatizado', estado: 'DISPONIBLE' },
      { id_nave: 4, codigo_nave: 'NAV-04', nombre: 'Nave Hortalizas de Hoja', superficie_m2: 1800, tipo_estructura: 'Sombreadero Malla Raschel', estado: 'MANTENCION' },
    ];
  }

  private getCiclosDefault(): CicloCultivo[] {
    return [
      {
        id_ciclo: 1,
        id_nave: 1,
        temporada: 'PRIMAVERA_2026',
        variedad: 'Tomate Larga Vida',
        fecha_inicio: '2026-08-15',
        fecha_termino_estimada: '2026-12-20',
        estado: 'ACTIVO',
        total_kg_cosechados: 18450,
        costo_total_acumulado: 8250000,
        costo_unitario_kg: 447.15
      },
      {
        id_ciclo: 2,
        id_nave: 2,
        temporada: 'PRIMAVERA_2026',
        variedad: 'Pimiento Cuadrado Rojo',
        fecha_inicio: '2026-09-01',
        fecha_termino_estimada: '2027-01-15',
        estado: 'ACTIVO',
        total_kg_cosechados: 9200,
        costo_total_acumulado: 4600000,
        costo_unitario_kg: 500.00
      }
    ];
  }

  private getLaboresDefault(): LaborAgricola[] {
    return [
      { id_labor: 1, id_ciclo: 1, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'SIEMBRA', fecha_ejecucion: '2026-08-15', horas_dedicadas: 16, observaciones_tecnicas: 'Siembra en sustrato inerte fibra de coco.' },
      { id_labor: 2, id_ciclo: 1, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'RIEGO', fecha_ejecucion: '2026-09-02', horas_dedicadas: 8, observaciones_tecnicas: 'Riego por goteo con pulso matutino.' },
      { id_labor: 3, id_ciclo: 1, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'FERTILIZACION', fecha_ejecucion: '2026-09-18', horas_dedicadas: 10, observaciones_tecnicas: 'Aplicación NPK soluble 18-18-18.' },
      { id_labor: 4, id_ciclo: 2, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'FITOSANITARIO', fecha_ejecucion: '2026-10-05', horas_dedicadas: 6, observaciones_tecnicas: 'Prevención botritis con fungicida autorizado.' }
    ];
  }

  private getCosechasDefault(): Cosecha[] {
    return [
      { id_cosecha: 1, id_ciclo: 1, id_usuario_pesaje: 2, fecha_cosecha: '2026-10-25', kilos_netos: 5200, calidad_grado: 'PRIMERA', kilos_disponibles_venta: 1200 },
      { id_cosecha: 2, id_ciclo: 1, id_usuario_pesaje: 2, fecha_cosecha: '2026-11-01', kilos_netos: 6400, calidad_grado: 'PRIMERA', kilos_disponibles_venta: 3400 },
      { id_cosecha: 3, id_ciclo: 2, id_usuario_pesaje: 2, fecha_cosecha: '2026-11-03', kilos_netos: 3800, calidad_grado: 'SEGUNDA', kilos_disponibles_venta: 2800 }
    ];
  }

  private getInsumosDefault(): Insumo[] {
    return [
      { id_insumo: 1, codigo_insumo: 'SEM-001', nombre: 'Semilla Tomate Larga Vida Híbrido', categoria: 'SEMILLA', unidad_medida: 'UNIDADES', stock_actual: 450, stock_minimo_alerta: 1000, costo_unitario_promedio: 120, es_material_vegetal: true }, // Stock Crítico
      { id_insumo: 2, codigo_insumo: 'ALM-002', nombre: 'Almácigos Pimiento Rojo 4 semanas', categoria: 'ALMACIGO', unidad_medida: 'BANDEJAS', stock_actual: 12, stock_minimo_alerta: 20, costo_unitario_promedio: 4500, es_material_vegetal: true }, // Stock Crítico
      { id_insumo: 3, codigo_insumo: 'FER-101', nombre: 'Fertilizante NPK Soluble 18-18-18', categoria: 'FERTILIZANTE', unidad_medida: 'KILOS', stock_actual: 1250, stock_minimo_alerta: 300, costo_unitario_promedio: 1850, es_material_vegetal: false },
      { id_insumo: 4, codigo_insumo: 'DES-201', nombre: 'Desinfectante Cobre Hidróxido 50%', categoria: 'DESINFECTANTE', unidad_medida: 'LITROS', stock_actual: 80, stock_minimo_alerta: 100, costo_unitario_promedio: 8900, es_material_vegetal: false }, // Stock Crítico
      { id_insumo: 5, codigo_insumo: 'FER-102', nombre: 'Nitrato de Calcio Grado Invernadero', categoria: 'FERTILIZANTE', unidad_medida: 'KILOS', stock_actual: 900, stock_minimo_alerta: 250, costo_unitario_promedio: 1200, es_material_vegetal: false }
    ];
  }

  private getMovimientosDefault(): MovimientoBodega[] {
    return [
      { id_movimiento: 1, id_insumo: 1, id_usuario: 3, tipo_movimiento: 'ENTRADA_COMPRA', fecha_movimiento: '2026-08-01', cantidad_nominal: 5000, porcentaje_merma: 5, cantidad_neta: 4750, costo_unitario_compra: 120, monto_total_movimiento: 570000, documento_referencia: 'FAC-1234' },
      { id_movimiento: 2, id_insumo: 1, id_usuario: 3, id_labor: 1, tipo_movimiento: 'SALIDA_LABOR', fecha_movimiento: '2026-08-15', cantidad_nominal: 2500, porcentaje_merma: 0, cantidad_neta: 2500, costo_unitario_compra: 120, monto_total_movimiento: 300000, documento_referencia: 'Labor #1' },
      { id_movimiento: 3, id_insumo: 2, id_usuario: 3, tipo_movimiento: 'AJUSTE_MERMA', fecha_movimiento: '2026-09-10', cantidad_nominal: 5, porcentaje_merma: 100, cantidad_neta: 0, costo_unitario_compra: 4500, monto_total_movimiento: 0, documento_referencia: 'Daño Térmico Invernadero' }
    ];
  }

  private getAsistenciasDefault(): AsistenciaJornal[] {
    return [
      { id_asistencia: 1, id_trabajador: 101, nombre_trabajador: 'Juan Pérez Morales', id_ciclo: 1, fecha_jornada: '2026-11-03', horas_trabajadas: 8, valor_hora_aplicado: 4500, monto_devengado: 36000, modalidad_pago: 'SEMANAL', estado_pago: 'PAGADO' },
      { id_asistencia: 2, id_trabajador: 102, nombre_trabajador: 'Pedro Gómez Ruiz', id_ciclo: 1, fecha_jornada: '2026-11-03', horas_trabajadas: 8, valor_hora_aplicado: 4500, monto_devengado: 36000, modalidad_pago: 'SEMANAL', estado_pago: 'PAGADO' },
      { id_asistencia: 3, id_trabajador: 103, nombre_trabajador: 'Ana María Fuentes', id_ciclo: 2, fecha_jornada: '2026-11-04', horas_trabajadas: 6, valor_hora_aplicado: 4800, monto_devengado: 28800, modalidad_pago: 'DIARIA', estado_pago: 'PENDIENTE' }
    ];
  }

  private getCostosIndirectosDefault(): CostoIndirecto[] {
    return [
      { id_costo_indirecto: 1, id_ciclo: 1, tipo_gasto: 'ELECTRICIDAD_BOMBEO', comprobante_factura: 'FAC-ENEL-8899', fecha_imputacion: '2026-10-31', monto_total_prorrateado: 620000, criterio_distribucion: 'SUPERFICIE_M2' },
      { id_costo_indirecto: 2, id_ciclo: 1, tipo_gasto: 'AGUA_RIEGO', comprobante_factura: 'CANAL-TALAGANTE-441', fecha_imputacion: '2026-10-31', monto_total_prorrateado: 280000, criterio_distribucion: 'SUPERFICIE_M2' },
      { id_costo_indirecto: 3, id_ciclo: 2, tipo_gasto: 'MANTENCION_NAVE', comprobante_factura: 'AGROTECH-FILMS-12', fecha_imputacion: '2026-11-02', monto_total_prorrateado: 350000, criterio_distribucion: 'EQUITATIVO_CICLOS' }
    ];
  }

  private getClientesDefault(): Cliente[] {
    return [
      { id_cliente: 1, rut_cliente: '76.123.456-7', razon_social: 'Distribuidora Agrícola Lo Valledor SpA', contacto_nombre: 'Hernán Silva', telefono: '+56 9 8888 7777', email: 'compras@lovalledor-dist.cl', direccion: 'Av. Cerrillos 4500, Santiago' },
      { id_cliente: 2, rut_cliente: '77.987.654-3', razon_social: 'Supermercados del Valle S.A.', contacto_nombre: 'Clara Espinosa', telefono: '+56 9 7777 6666', email: 'abastecimiento@valle-super.cl', direccion: 'Camino Melipilla Km 24' },
      { id_cliente: 3, rut_cliente: '14.555.666-8', razon_social: 'Verdulería Premium Las Condes', contacto_nombre: 'Ignacio Larraín', telefono: '+56 9 5555 4444', email: 'ilarrain@frescura.cl', direccion: 'Apoquindo 6400, Las Condes' }
    ];
  }

  private getVentasDefault(): Venta[] {
    return [
      { id_venta: 1, id_cliente: 1, id_cosecha: 1, numero_nota_venta: 'NV-2026-0001', fecha_venta: '2026-10-26', kilos_vendidos: 4000, precio_unitario_venta: 950, monto_total_ingreso: 3800000, costo_unitario_ciclo_ref: 447.15, margen_bruto_operativo: 2011400, estado_despacho: 'ENTREGADO' },
      { id_venta: 2, id_cliente: 2, id_cosecha: 2, numero_nota_venta: 'NV-2026-0002', fecha_venta: '2026-11-02', kilos_vendidos: 3000, precio_unitario_venta: 980, monto_total_ingreso: 2940000, costo_unitario_ciclo_ref: 447.15, margen_bruto_operativo: 1598550, estado_despacho: 'DESPACHADO' },
      { id_venta: 3, id_cliente: 3, id_cosecha: 3, numero_nota_venta: 'NV-2026-0003', fecha_venta: '2026-11-04', kilos_vendidos: 1000, precio_unitario_venta: 1250, monto_total_ingreso: 1250000, costo_unitario_ciclo_ref: 500.00, margen_bruto_operativo: 750000, estado_despacho: 'PENDIENTE' }
    ];
  }
}

