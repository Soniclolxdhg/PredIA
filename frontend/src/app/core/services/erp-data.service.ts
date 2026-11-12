import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ProduccionApiService } from './produccion.service';
import { InventarioApiService } from './inventario.service';
import {
  CrearNaveDto,
  CrearCicloDto,
  CerrarCicloDto,
  CrearLaborDto,
  CrearCosechaDto
} from '../models/dtos';
import {
  Nave,
  CicloCultivo,
  LaborAgricola,
  Insumo,
  MovimientoBodega,
  AlertaStock,
  AsistenciaJornal,
  CostoIndirecto,
  Cosecha,
  Cliente,
  Venta,
  InspeccionNave
} from '../models/erp.models';

/**
 * Servicio Central de Datos Agrícolas y Operaciones de Terreno.
 * Conecta las Naves e Invernaderos y los Ciclos de Cultivo directamente
 * con el backend NestJS y la base de datos PostgreSQL en Supabase.
 * Los datos se gestionan en memoria reactiva (Signals) sin almacenamiento en LocalStorage.
 */
@Injectable({
  providedIn: 'root'
})
export class ErpDataService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly produccionApi = inject(ProduccionApiService);
  private readonly inventarioApi = inject(InventarioApiService);

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
  readonly labores = signal<LaborAgricola[]>(this.getLaboresDefault());

  // 4. Cosechas y Pesaje (HU03)
  readonly cosechas = signal<Cosecha[]>(this.getCosechasDefault());

  // 5. Insumos y Bodega (HU04 - Conectados en vivo a API)
  readonly insumos = signal<Insumo[]>([]);
  readonly cargandoInsumos = signal<boolean>(false);

  // 6. Kardex y Mermas (HU04 - Conectados en vivo a API)
  readonly movimientosBodega = signal<MovimientoBodega[]>([]);
  readonly cargandoMovimientos = signal<boolean>(false);

  // 6.b Alertas de Stock Crítico (HU05)
  readonly alertasStock = signal<AlertaStock[]>([]);

  // 7. Asistencia y Jornales (HU06)
  readonly asistencias = signal<AsistenciaJornal[]>(this.getAsistenciasDefault());

  // 8. Costos Indirectos (HU07)
  readonly costosIndirectos = signal<CostoIndirecto[]>(this.getCostosIndirectosDefault());

  // 9. Directorio Clientes (HU08)
  readonly clientes = signal<Cliente[]>(this.getClientesDefault());

  // 10. Notas de Venta (HU10)
  readonly ventas = signal<Venta[]>(this.getVentasDefault());

  // 11. Inspecciones y Checklist de Naves (Supervisión en Terreno)
  readonly inspecciones = signal<InspeccionNave[]>(this.getInspeccionesDefault());

  // Señales reactivas computadas para KPIs agronómicos y financieros
  readonly insumosCriticos = computed(() =>
    this.insumos().filter((i) => i.es_stock_critico || i.stock_actual <= i.stock_minimo_alerta)
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
    // Purgar de LocalStorage cualquier dato de negocio y mock previo para evitar inconsistencias
    if (typeof localStorage !== 'undefined') {
      try {
        const clavesABorrar: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('predia_agri_') || k.startsWith('predia_agri_v2_') || k === 'predia_usuarios_list' || k === 'predia_usuarios_lista')) {
            clavesABorrar.push(k);
          }
        }
        clavesABorrar.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignorar excepciones en entornos sin acceso a almacenamiento local
      }
    }

    // Al instanciar el servicio, recupera los datos reales de Supabase
    this.cargarNaves().subscribe();
    this.cargarCiclos().subscribe();
    this.cargarInsumos().subscribe({ error: () => {} });
    this.cargarMovimientos().subscribe({ error: () => {} });
    this.cargarAlertas().subscribe({ error: () => {} });
  }

  // ==========================================
  // OPERACIONES HTTP BODEGA E INSUMOS (HU04, HU05)
  // ==========================================

  cargarInsumos(soloStockBajo?: boolean): Observable<Insumo[]> {
    this.cargandoInsumos.set(true);
    return this.inventarioApi.listarInsumos(soloStockBajo).pipe(
      tap((ins) => {
        this.insumos.set(ins);
        this.cargandoInsumos.set(false);
      }),
      catchError((err) => {
        this.cargandoInsumos.set(false);
        return throwError(() => err);
      })
    );
  }

  cargarMovimientos(): Observable<MovimientoBodega[]> {
    this.cargandoMovimientos.set(true);
    return this.inventarioApi.consultarKardex().pipe(
      tap((movs) => {
        this.movimientosBodega.set(movs);
        this.cargandoMovimientos.set(false);
      }),
      catchError((err) => {
        this.cargandoMovimientos.set(false);
        return throwError(() => err);
      })
    );
  }

  cargarAlertas(): Observable<AlertaStock[]> {
    return this.inventarioApi.listarAlertas('ABIERTA').pipe(
      tap((alerts) => this.alertasStock.set(alerts)),
      catchError((err) => throwError(() => err))
    );
  }

  // ==========================================
  // OPERACIONES HTTP CON SUPABASE (BACKEND API)
  // ==========================================

  /**
   * Carga la lista real de naves desde la base de datos de Supabase
   */
  cargarNaves(): Observable<Nave[]> {
    this.cargandoNaves.set(true);
    return this.produccionApi.listarNaves().pipe(
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
  crearNave(
    dto: CrearNaveDto | {
      codigo_nave: string;
      nombre: string;
      superficie_m2: number;
      tipo_estructura?: string;
    }
  ): Observable<{ exito: boolean; mensaje: string; nave?: Nave }> {
    const payload: CrearNaveDto = 'codigoNave' in dto
      ? dto
      : {
          codigoNave: dto.codigo_nave.trim().toUpperCase(),
          nombre: dto.nombre.trim(),
          superficieM2: Number(dto.superficie_m2),
          tipoEstructura: dto.tipo_estructura || 'Multitúnel Metal'
        };

    return this.produccionApi.crearNave(payload).pipe(
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
    return this.produccionApi.listarCiclos().pipe(
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
  crearCicloCultivo(
    dto: CrearCicloDto | {
      id_nave: number;
      temporada: string;
      variedad: string;
      fecha_inicio: string;
      fecha_termino_estimada: string;
    }
  ): Observable<{ exito: boolean; mensaje: string }> {
    const payload: CrearCicloDto = 'idNave' in dto
      ? dto
      : {
          idNave: Number(dto.id_nave),
          temporada: dto.temporada,
          variedad: dto.variedad,
          fechaInicio: dto.fecha_inicio,
          fechaTerminoEstimada: dto.fecha_termino_estimada || undefined
        };

    const naveId = payload.idNave;

    return this.produccionApi.crearCiclo(payload).pipe(
      map((nuevoRaw) => {
        const nuevo = this.normalizarCiclo(nuevoRaw);
        this.ciclos.update((lista) => [nuevo, ...lista]);
        this.naves.update((lista) =>
          lista.map((n) => (n.id_nave === naveId ? { ...n, estado: 'EN_CULTIVO' } : n))
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
    return this.produccionApi.sembrarNavesBase().pipe(
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

  /**
   * HU01: Cierre formal de ciclo de cultivo (PATCH /produccion/ciclos/:idCiclo/cerrar)
   */
  cerrarCicloCultivo(idCiclo: number, fechaCierreReal?: string): Observable<{ exito: boolean; mensaje: string }> {
    const payload: CerrarCicloDto = {
      fechaCierreReal: fechaCierreReal || new Date().toISOString().split('T')[0]
    };

    return this.produccionApi.cerrarCiclo(idCiclo, payload).pipe(
      map(() => {
        this.cargarCiclos().subscribe();
        this.cargarNaves().subscribe();
        return {
          exito: true,
          mensaje: `Ciclo #${idCiclo} cerrado exitosamente en Supabase. Nave liberada a DISPONIBLE.`
        };
      }),
      catchError((err) => of({
        exito: false,
        mensaje: err.error?.message || 'Error al cerrar ciclo en Supabase.'
      }))
    );
  }

  /**
   * HU02: Registrar labor agrícola en terreno (POST /produccion/labores)
   */
  registrarLaborApi(dto: CrearLaborDto): Observable<{ exito: boolean; mensaje: string }> {
    return this.produccionApi.registrarLabor(dto).pipe(
      map(() => ({
        exito: true,
        mensaje: `Labor ${dto.tipoLabor} registrada exitosamente en Supabase.`
      })),
      catchError((err) => of({
        exito: false,
        mensaje: err.error?.message || 'Error al registrar labor en Supabase.'
      }))
    );
  }

  /**
   * HU03: Registrar pesaje de cosecha (POST /produccion/cosechas)
   */
  registrarCosechaApi(dto: CrearCosechaDto): Observable<{ exito: boolean; mensaje: string }> {
    return this.produccionApi.registrarCosecha(dto).pipe(
      map(() => {
        this.cargarCiclos().subscribe();
        return {
          exito: true,
          mensaje: `Cosecha de ${dto.kilosNetos} Kg (${dto.calidadGrado}) registrada exitosamente en Supabase.`
        };
      }),
      catchError((err) => of({
        exito: false,
        mensaje: err.error?.message || 'Error al registrar cosecha en Supabase.'
      }))
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
   * HU06: Registro de asistencia de mano de obra
   */
  registrarAsistencia(asistencia: Omit<AsistenciaJornal, 'id_asistencia' | 'monto_devengado'>): void {
    const devengado = asistencia.horas_trabajadas * asistencia.valor_hora_aplicado;
    const nueva: AsistenciaJornal = {
      ...asistencia,
      id_asistencia: this.asistencias().length + 1,
      monto_devengado: devengado
    };

    this.imputarCostoACiclo(asistencia.id_ciclo, devengado);
    this.asistencias.update((lista) => [nueva, ...lista]);
  }

  /**
   * HU08: Registro de cliente comprador
   */
  registrarCliente(cliente: Omit<Cliente, 'id_cliente'>): void {
    const nuevo: Cliente = {
      ...cliente,
      id_cliente: this.clientes().length + 1
    };
    this.clientes.update((lista) => [nuevo, ...lista]);
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

    return { exito: true, mensaje: `Nota de venta ${nuevaVenta.numero_nota_venta} generada exitosamente.` };
  }

  generarNotaVenta(
    venta: Omit<Venta, 'id_venta' | 'numero_nota_venta' | 'margen_bruto_operativo' | 'costo_unitario_ciclo_ref'>
  ): { exito: boolean; mensaje: string } {
    return this.registrarVenta(venta);
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
  }

  private getLaboresDefault(): LaborAgricola[] {
    return [];
  }

  private getCosechasDefault(): Cosecha[] {
    return [];
  }

  private getInsumosDefault(): Insumo[] {
    return [];
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
    return [];
  }

  private getVentasDefault(): Venta[] {
    return [];
  }

  private getInspeccionesDefault(): InspeccionNave[] {
    return [];
  }
}
