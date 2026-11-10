import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { AuthService } from './auth.service';
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
  Venta,
  InspeccionNave
} from '../models/erp.models';

const STORAGE_PREFIX = 'predia_agri_v2_';

/**
 * Servicio Central de Datos Agrícolas y Operaciones de Terreno.
 * Conecta las Naves e Invernaderos y los Ciclos de Cultivo directamente
 * con el backend NestJS y la base de datos PostgreSQL en Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class ErpDataService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get apiUrl(): string {
    return this.authService.baseUrl();
  }

  // 1. Naves e Invernaderos (Conectadas en vivo a Supabase)
  readonly naves = signal<Nave[]>([]);
  readonly cargandoNaves = signal<boolean>(false);

  // 2. Ciclos de Cultivo (HU01 - Conectados en vivo a Supabase)
  readonly ciclos = signal<CicloCultivo[]>([]);
  readonly cargandoCiclos = signal<boolean>(false);

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

  // 11. Inspecciones y Checklist de Naves (Supervisión en Terreno)
  readonly inspecciones = signal<InspeccionNave[]>(
    this.cargarInitial('inspecciones', this.getInspeccionesDefault)
  );

  // Señales reactivas computadas para KPIs agronómicos y financieros
  readonly insumosCriticos = computed(() =>
    this.insumos().filter((i) => i.stock_actual <= i.stock_minimo_alerta)
  );

  // Lista de ciclos que se encuentran actualmente en estado ACTIVO en Supabase
  readonly ciclosActivos = computed(() =>
    this.ciclos().filter((c) => c.estado === 'ACTIVO')
  );

  // Consolidado de costos globales y costo unitario $/Kg
  readonly kpisFinancieros = computed(() => {
    const totalKg = this.ciclos().reduce((acc, c) => acc + c.total_kg_cosechados, 0);
    const totalCostos = this.ciclos().reduce((acc, c) => acc + c.costo_total_acumulado, 0);
    const costoPromedioKg = totalKg > 0 ? totalCostos / totalKg : 0;

    const totalVentas = this.ventas().reduce((acc, v) => acc + v.monto_total_ingreso, 0);
    const margenBrutoTotal = this.ventas().reduce((acc, v) => acc + v.margen_bruto_operativo, 0);
    const margenPct = totalVentas > 0 ? (margenBrutoTotal / totalVentas) * 100 : 0;

    return {
      totalKgCosechados: totalKg,
      totalCostosAcumulados: totalCostos,
      costoPromedioKg: Math.round(costoPromedioKg * 100) / 100,
      totalVentasMonto: totalVentas,
      margenBrutoTotal: margenBrutoTotal,
      margenPorcentaje: Math.round(margenPct * 10) / 10
    };
  });

  constructor() {
    // Al instanciar el servicio, recupera los datos reales de Supabase
    this.cargarNaves().subscribe();
    this.cargarCiclos().subscribe();
  }

  // ==========================================
  // OPERACIONES HTTP CON SUPABASE (BACKEND API)
  // ==========================================

  /**
   * Carga la lista real de naves desde la base de datos de Supabase
   */
  cargarNaves(): Observable<Nave[]> {
    this.cargandoNaves.set(true);
    return this.http.get<any[]>(`${this.apiUrl}/produccion/naves`).pipe(
      map((lista) => lista.map(this.normalizarNave)),
      tap((naves) => {
        this.naves.set(naves);
        this.cargandoNaves.set(false);
      }),
      catchError((err) => {
        this.cargandoNaves.set(false);
        console.warn('No fue posible cargar naves desde la API:', err);
        return of(this.naves());
      })
    );
  }

  /**
   * Registra una nueva Nave o Invernadero directamente en la base de datos de Supabase.
   */
  crearNave(dto: {
    codigo_nave: string;
    nombre: string;
    superficie_m2: number;
    tipo_estructura?: string;
  }): Observable<{ exito: boolean; mensaje: string; nave?: Nave }> {
    return this.http.post<any>(`${this.apiUrl}/produccion/naves`, {
      codigoNave: dto.codigo_nave.trim().toUpperCase(),
      nombre: dto.nombre.trim(),
      superficieM2: Number(dto.superficie_m2),
      tipoEstructura: dto.tipo_estructura || 'Multitúnel Metal'
    }).pipe(
      map((nuevaRaw) => {
        const nueva = this.normalizarNave(nuevaRaw);
        this.naves.update((lista) => [...lista, nueva]);
        return {
          exito: true,
          mensaje: `Nave ${nueva.codigo_nave} (${nueva.nombre}) guardada exitosamente en Supabase.`,
          nave: nueva
        };
      }),
      catchError((err) => {
        const msg = err.error?.message || 'Error al guardar la nave en Supabase.';
        return of({
          exito: false,
          mensaje: Array.isArray(msg) ? msg.join(', ') : msg
        });
      })
    );
  }

  /**
   * Carga la lista real de ciclos de cultivo desde la base de datos de Supabase
   */
  cargarCiclos(): Observable<CicloCultivo[]> {
    this.cargandoCiclos.set(true);
    return this.http.get<any[]>(`${this.apiUrl}/produccion/ciclos`).pipe(
      map((lista) => lista.map(this.normalizarCiclo)),
      tap((ciclos) => {
        this.ciclos.set(ciclos);
        this.cargandoCiclos.set(false);
      }),
      catchError((err) => {
        this.cargandoCiclos.set(false);
        console.warn('No fue posible cargar ciclos desde la API:', err);
        return of(this.ciclos());
      })
    );
  }

  /**
   * HU01: Apertura de nuevo ciclo guardando directamente en la base de datos de Supabase.
   */
  crearCicloCultivo(dto: {
    id_nave: number;
    temporada: string;
    variedad: string;
    fecha_inicio: string;
    fecha_termino_estimada: string;
  }): Observable<{ exito: boolean; mensaje: string }> {
    return this.http.post<any>(`${this.apiUrl}/produccion/ciclos`, {
      idNave: Number(dto.id_nave),
      temporada: dto.temporada,
      variedad: dto.variedad,
      fechaInicio: dto.fecha_inicio,
      fechaTerminoEstimada: dto.fecha_termino_estimada || undefined
    }).pipe(
      map((nuevoRaw) => {
        const nuevo = this.normalizarCiclo(nuevoRaw);
        this.ciclos.update((lista) => [nuevo, ...lista]);
        this.naves.update((lista) =>
          lista.map((n) => (n.id_nave === Number(dto.id_nave) ? { ...n, estado: 'EN_CULTIVO' } : n))
        );
        return {
          exito: true,
          mensaje: `Ciclo #${nuevo.id_ciclo} (${nuevo.variedad}) guardado exitosamente en Supabase.`
        };
      }),
      catchError((err) => {
        const msg = err.error?.message || 'Error al conectar con la base de datos de Supabase.';
        return of({
          exito: false,
          mensaje: Array.isArray(msg) ? msg.join(', ') : msg
        });
      })
    );
  }

  /**
   * Siembra las 4 naves de Santa Laura Ltda. en Supabase si la tabla está vacía.
   */
  sembrarNavesBase(): Observable<{ exito: boolean; mensaje: string }> {
    this.cargandoNaves.set(true);
    return this.http.post<any>(`${this.apiUrl}/produccion/sembrar-naves`, {}).pipe(
      tap(() => {
        this.cargarNaves().subscribe();
      }),
      map((res) => ({
        exito: true,
        mensaje: res.mensaje || 'Naves sembradas exitosamente en Supabase.'
      })),
      catchError((err) => {
        this.cargandoNaves.set(false);
        return of({
          exito: false,
          mensaje: err.error?.message || 'Error al sembrar naves en Supabase.'
        });
      })
    );
  }

  // ==========================================
  // NORMALIZADORES DE DATOS SUPABASE (PRISMA)
  // ==========================================

  private normalizarNave(n: any): Nave {
    return {
      id_nave: n.idNave ?? n.id_nave,
      codigo_nave: n.codigoNave ?? n.codigo_nave,
      nombre: n.nombre,
      superficie_m2: Number(n.superficieM2 ?? n.superficie_m2 ?? 0),
      tipo_estructura: n.tipoEstructura ?? n.tipo_estructura ?? 'Multitúnel',
      estado: n.estado ?? 'DISPONIBLE'
    };
  }

  private normalizarCiclo(c: any): CicloCultivo {
    return {
      id_ciclo: c.idCiclo ?? c.id_ciclo,
      id_nave: c.idNave ?? c.id_nave,
      nave: c.nave
        ? {
            id_nave: c.nave.idNave ?? c.nave.id_nave,
            codigo_nave: c.nave.codigoNave ?? c.nave.codigo_nave,
            nombre: c.nave.nombre,
            superficie_m2: Number(c.nave.superficieM2 ?? c.nave.superficie_m2 ?? 0),
            tipo_estructura: c.nave.tipoEstructura ?? c.nave.tipo_estructura ?? 'Multitúnel',
            estado: c.nave.estado ?? 'DISPONIBLE'
          }
        : undefined,
      temporada: c.temporada,
      variedad: c.variedad,
      fecha_inicio: c.fechaInicio
        ? new Date(c.fechaInicio).toISOString().split('T')[0]
        : (c.fecha_inicio ?? ''),
      fecha_termino_estimada: c.fechaTerminoEstimada
        ? new Date(c.fechaTerminoEstimada).toISOString().split('T')[0]
        : (c.fecha_termino_estimada ?? ''),
      fecha_cierre_real: c.fechaCierreReal
        ? new Date(c.fechaCierreReal).toISOString().split('T')[0]
        : c.fecha_cierre_real,
      estado: c.estado ?? 'ACTIVO',
      total_kg_cosechados: Number(c.totalKgCosechados ?? c.total_kg_cosechados ?? 0),
      costo_total_acumulado: Number(c.costoTotalAcumulado ?? c.costo_total_acumulado ?? 0),
      costo_unitario_kg: Number(c.costoUnitarioKg ?? c.costo_unitario_kg ?? 0)
    };
  }

  // ==========================================
  // OPERACIONES DE TERRENO Y BODEGA
  // ==========================================

  /**
   * HU02: Registro de Labor en Terreno con descuento opcional de insumos de bodega
   */
  registrarLabor(labor: Omit<LaborAgricola, 'id_labor'>): void {
    const nuevaLabor: LaborAgricola = {
      ...labor,
      id_labor: this.labores().length + 1
    };

    if (labor.id_insumo_utilizado && labor.cantidad_insumo_utilizado) {
      this.descontarStockInsumo(
        labor.id_insumo_utilizado,
        labor.cantidad_insumo_utilizado,
        nuevaLabor.id_labor
      );
    }

    const costoEstimadoLabor = labor.horas_dedicadas * 4500;
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
  }

  /**
   * HU04: Control de stock en bodega
   */
  descontarStockInsumo(idInsumo: number, cantidad: number, idLabor?: number): void {
    this.insumos.update((lista) =>
      lista.map((ins) => {
        if (ins.id_insumo === idInsumo) {
          const nuevoStock = Math.max(0, ins.stock_actual - cantidad);
          return { ...ins, stock_actual: nuevoStock };
        }
        return ins;
      })
    );

    const mov: MovimientoBodega = {
      id_movimiento: this.movimientosBodega().length + 1,
      id_insumo: idInsumo,
      id_usuario: 3,
      id_labor: idLabor,
      tipo_movimiento: 'SALIDA_LABOR',
      fecha_movimiento: new Date().toISOString().split('T')[0],
      cantidad_nominal: cantidad,
      porcentaje_merma: 0,
      cantidad_neta: cantidad,
      costo_unitario_compra: 1500,
      monto_total_movimiento: cantidad * 1500,
      documento_referencia: `Labor Terreno #${idLabor ?? 'N/A'}`
    };

    this.movimientosBodega.update((lista) => [mov, ...lista]);
    this.persistir('insumos', this.insumos());
    this.persistir('movimientos', this.movimientosBodega());
  }

  /**
   * Imputa costos directos o indirectos al costo acumulado del ciclo
   */
  imputarCostoACiclo(idCiclo: number, monto: number): void {
    this.ciclos.update((lista) =>
      lista.map((c) => {
        if (c.id_ciclo === idCiclo) {
          const nuevoTotal = c.costo_total_acumulado + monto;
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
  }

  /**
   * HU07: Prorrateo de costos indirectos
   */
  registrarCostoIndirecto(costo: Omit<CostoIndirecto, 'id_costo_indirecto'>): void {
    const nuevo: CostoIndirecto = {
      ...costo,
      id_costo_indirecto: this.costosIndirectos().length + 1
    };

    this.imputarCostoACiclo(costo.id_ciclo, costo.monto_total_prorrateado);
    this.costosIndirectos.update((lista) => [nuevo, ...lista]);
    this.persistir('indirectos', this.costosIndirectos());
  }

  /**
   * HU10: Registro y cálculo de Nota de Venta
   */
  registrarVenta(
    venta: Omit<Venta, 'id_venta' | 'numero_nota_venta' | 'margen_bruto_operativo' | 'costo_unitario_ciclo_ref'>
  ): { exito: boolean; mensaje: string } {
    const cosecha = this.cosechas().find((c) => c.id_cosecha === venta.id_cosecha);
    if (!cosecha) return { exito: false, mensaje: 'El lote de cosecha seleccionado no existe.' };

    if (venta.kilos_vendidos > cosecha.kilos_disponibles_venta) {
      return {
        exito: false,
        mensaje: `No hay suficientes kilos disponibles. Disponibles: ${cosecha.kilos_disponibles_venta} Kg.`
      };
    }

    const ciclo = this.ciclos().find((c) => c.id_ciclo === cosecha.id_ciclo);
    const costoRef = ciclo?.costo_unitario_kg ?? 450;
    const costoVendido = venta.kilos_vendidos * costoRef;
    const margenBruto = venta.monto_total_ingreso - costoVendido;

    const nuevaVenta: Venta = {
      ...venta,
      id_venta: this.ventas().length + 1,
      numero_nota_venta: `NV-2026-${String(this.ventas().length + 1).padStart(4, '0')}`,
      costo_unitario_ciclo_ref: costoRef,
      margen_bruto_operativo: margenBruto
    };

    this.cosechas.update((lista) =>
      lista.map((c) => {
        if (c.id_cosecha === venta.id_cosecha) {
          return {
            ...c,
            kilos_disponibles_venta: c.kilos_disponibles_venta - venta.kilos_vendidos
          };
        }
        return c;
      })
    );

    this.ventas.update((lista) => [nuevaVenta, ...lista]);
    this.persistir('ventas', this.ventas());
    this.persistir('cosechas', this.cosechas());

    return { exito: true, mensaje: `Nota de venta ${nuevaVenta.numero_nota_venta} generada exitosamente.` };
  }

  /**
   * Registra una nueva inspección física de nave en terreno (Tablet / Checklist)
   */
  registrarInspeccion(inspeccion: Omit<InspeccionNave, 'id_inspeccion'>): void {
    const nueva: InspeccionNave = {
      ...inspeccion,
      id_inspeccion: this.inspecciones().length + 1
    };
    this.inspecciones.update((lista) => [nueva, ...lista]);
    this.persistir('inspecciones', this.inspecciones());
  }

  // ==========================================
  // PERSISTENCIA LOCAL PARA MÓDULOS EN PROCESO
  // ==========================================

  private cargarInitial<T>(key: string, factory: () => T): T {
    if (typeof localStorage === 'undefined') return factory();
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
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  }

  private getLaboresDefault(): LaborAgricola[] {
    return [
      { id_labor: 1, id_ciclo: 1, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'SIEMBRA', fecha_ejecucion: '2026-08-15', horas_dedicadas: 16, observaciones_tecnicas: 'Siembra en sustrato inerte fibra de coco.' },
      { id_labor: 2, id_ciclo: 1, id_usuario_responsable: 2, nombre_responsable: 'Macarena Soto', tipo_labor: 'RIEGO', fecha_ejecucion: '2026-09-02', horas_dedicadas: 8, observaciones_tecnicas: 'Riego por goteo con pulso matutino.' }
    ];
  }

  private getCosechasDefault(): Cosecha[] {
    return [
      { id_cosecha: 1, id_ciclo: 1, id_usuario_pesaje: 2, fecha_cosecha: '2026-10-25', kilos_netos: 5200, calidad_grado: 'PRIMERA', kilos_disponibles_venta: 1200 }
    ];
  }

  private getInsumosDefault(): Insumo[] {
    return [
      { id_insumo: 1, codigo_insumo: 'SEM-TOM-01', nombre: 'Semilla Tomate Larga Vida Híbrido', categoria: 'SEMILLA', unidad_medida: 'UNIDADES', stock_actual: 5000, stock_minimo_alerta: 1000, costo_unitario_promedio: 120, es_material_vegetal: true },
      { id_insumo: 2, codigo_insumo: 'SEM-PIM-01', nombre: 'Semilla Pimiento Cuadrado Rojo', categoria: 'SEMILLA', unidad_medida: 'UNIDADES', stock_actual: 2000, stock_minimo_alerta: 500, costo_unitario_promedio: 150, es_material_vegetal: true }
    ];
  }

  private getMovimientosDefault(): MovimientoBodega[] {
    return [];
  }

  private getAsistenciasDefault(): AsistenciaJornal[] {
    return [];
  }

  private getCostosIndirectosDefault(): CostoIndirecto[] {
    return [];
  }

  private getClientesDefault(): Cliente[] {
    return [
      { id_cliente: 1, rut_cliente: '76.123.456-7', razon_social: 'Distribuidora Agrícola Lo Valledor SpA', contacto_nombre: 'Hernán Silva', telefono: '+56 9 8888 7777', email: 'compras@lovalledor-dist.cl', direccion: 'Av. Cerrillos 4500, Santiago' }
    ];
  }

  private getVentasDefault(): Venta[] {
    return [];
  }

  private getInspeccionesDefault(): InspeccionNave[] {
    return [];
  }
}
