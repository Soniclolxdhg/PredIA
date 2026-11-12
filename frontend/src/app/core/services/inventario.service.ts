import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { AuthService } from './auth.service';
import { INVENTARIO_ENDPOINTS } from '../constants/inventario.endpoints';
import {
  CrearInsumoDto,
  ActualizarInsumoDto,
  RegistrarMovimientoDto
} from '../models/dtos';
import { Insumo, MovimientoBodega, AlertaStock } from '../models/erp.models';

/**
 * Servicio Especializado de Comunicación API para el Módulo de Inventario y Bodega (HU04, HU05).
 * Conecta con los endpoints REST oficiales de NestJS, implementa tipado con DTOs
 * y emite logs de trazabilidad (console.log) para cada operación POST y PATCH.
 */
@Injectable({
  providedIn: 'root'
})
export class InventarioApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  // ==========================================
  // 1. CATÁLOGO DE INSUMOS
  // ==========================================

  /**
   * Obtiene la lista de insumos desde el backend
   * Permite filtrar por soloStockBajo=true o por categoría
   */
  listarInsumos(soloStockBajo?: boolean, categoria?: string): Observable<Insumo[]> {
    let url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.INSUMOS}`;
    const params: string[] = [];
    if (soloStockBajo) params.push('soloStockBajo=true');
    if (categoria) params.push(`categoria=${categoria}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url).pipe(
      map((lista) => lista.map((i) => this.normalizarInsumo(i))),
      catchError((err) => {
        console.error(`❌ [GET ${INVENTARIO_ENDPOINTS.INSUMOS}] Error al consultar insumos:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Obtiene el detalle de un insumo específico por su identificador
   */
  obtenerInsumoPorId(id: number): Observable<Insumo> {
    const url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.INSUMO_POR_ID(id)}`;
    return this.http.get<any>(url).pipe(
      map((i) => this.normalizarInsumo(i)),
      catchError((err) => {
        console.error(`❌ [GET insumo #${id}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Registra un nuevo insumo en la bodega central
   */
  crearInsumo(dto: CrearInsumoDto): Observable<Insumo> {
    const url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.INSUMOS}`;
    console.log(`📤 [POST ${INVENTARIO_ENDPOINTS.INSUMOS}] Registrando nuevo insumo en bodega:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${INVENTARIO_ENDPOINTS.INSUMOS}]:`, res)),
      map((res) => this.normalizarInsumo(res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${INVENTARIO_ENDPOINTS.INSUMOS}]:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Actualiza parámetros y umbrales de alerta de un insumo
   */
  actualizarInsumo(id: number, dto: ActualizarInsumoDto): Observable<Insumo> {
    const url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.INSUMO_POR_ID(id)}`;
    console.log(`📤 [PATCH ${INVENTARIO_ENDPOINTS.INSUMO_POR_ID(id)}] Actualizando insumo #${id}:`, dto);

    return this.http.patch<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta PATCH insumo #${id}]:`, res)),
      map((res) => this.normalizarInsumo(res)),
      catchError((err) => {
        console.error(`❌ [Error PATCH insumo #${id}]:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 2. KARDEX & MOVIMIENTOS (HU04)
  // ==========================================

  /**
   * Consulta el historial inmutable de movimientos en Kardex
   */
  consultarKardex(idInsumo?: number, tipoMovimiento?: string): Observable<MovimientoBodega[]> {
    let url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.MOVIMIENTOS}`;
    const params: string[] = [];
    if (idInsumo) params.push(`idInsumo=${idInsumo}`);
    if (tipoMovimiento) params.push(`tipoMovimiento=${tipoMovimiento}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url).pipe(
      map((lista) => lista.map((m) => this.normalizarMovimiento(m))),
      catchError((err) => {
        console.error(`❌ [GET ${INVENTARIO_ENDPOINTS.MOVIMIENTOS}] Error al consultar Kardex:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Registra un movimiento en Kardex con cálculo de merma y actualización de PMP
   */
  registrarMovimiento(dto: RegistrarMovimientoDto): Observable<any> {
    const url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.MOVIMIENTOS}`;
    console.log(`📤 [POST ${INVENTARIO_ENDPOINTS.MOVIMIENTOS}] Registrando movimiento Kardex:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${INVENTARIO_ENDPOINTS.MOVIMIENTOS}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${INVENTARIO_ENDPOINTS.MOVIMIENTOS}]:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 3. ALERTAS DE STOCK CRÍTICO (HU05)
  // ==========================================

  /**
   * Obtiene la lista de alertas generadas automáticamente por bajo stock
   */
  listarAlertas(estado?: string): Observable<AlertaStock[]> {
    let url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.ALERTAS}`;
    if (estado) url += `?estado=${estado}`;

    return this.http.get<any[]>(url).pipe(
      map((lista) => lista.map((a) => this.normalizarAlerta(a))),
      catchError((err) => {
        console.error(`❌ [GET ${INVENTARIO_ENDPOINTS.ALERTAS}] Error al listar alertas:`, err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Marca una alerta de stock como atendida
   */
  atenderAlerta(idAlerta: number): Observable<any> {
    const url = `${this.baseUrl}${INVENTARIO_ENDPOINTS.ATENDER_ALERTA(idAlerta)}`;
    console.log(`📤 [PATCH ${INVENTARIO_ENDPOINTS.ATENDER_ALERTA(idAlerta)}] Atendiendo alerta #${idAlerta}`);

    return this.http.patch<any>(url, {}).pipe(
      tap((res) => console.log(`📥 [Respuesta PATCH atender alerta #${idAlerta}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error PATCH atender alerta #${idAlerta}]:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // NORMALIZADORES DE DATOS
  // ==========================================

  private normalizarInsumo(raw: any): Insumo {
    const stockActual = Number(raw.stockActual ?? raw.stock_actual ?? 0);
    const stockMinimo = Number(raw.stockMinimoAlerta ?? raw.stock_minimo_alerta ?? 0);
    const esCritico = raw.esStockCritico ?? (stockActual <= stockMinimo);

    return {
      id_insumo: raw.idInsumo ?? raw.id_insumo ?? 0,
      codigo_insumo: raw.codigoInsumo ?? raw.codigo_insumo ?? '',
      nombre: raw.nombre ?? '',
      categoria: raw.categoria ?? 'OTRO',
      unidad_medida: raw.unidadMedida ?? raw.unidad_medida ?? 'UNIDADES',
      stock_actual: stockActual,
      stock_minimo_alerta: stockMinimo,
      costo_unitario_promedio: Number(raw.costoUnitarioPromedio ?? raw.costo_unitario_promedio ?? 0),
      es_material_vegetal: Boolean(raw.esMaterialVegetal ?? raw.es_material_vegetal ?? false),
      es_stock_critico: esCritico
    };
  }

  private normalizarMovimiento(raw: any): MovimientoBodega {
    return {
      id_movimiento: raw.idMovimiento ?? raw.id_movimiento ?? 0,
      id_insumo: raw.idInsumo ?? raw.id_insumo ?? 0,
      insumo: raw.insumo ? this.normalizarInsumo(raw.insumo) : undefined,
      id_usuario: raw.idUsuario ?? raw.id_usuario ?? 0,
      id_labor: raw.idLabor ?? raw.id_labor ?? undefined,
      tipo_movimiento: raw.tipoMovimiento ?? raw.tipo_movimiento ?? 'ENTRADA_COMPRA',
      fecha_movimiento: raw.fechaMovimiento ? String(raw.fechaMovimiento).split('T')[0] : (raw.fecha_movimiento ?? ''),
      cantidad_nominal: Number(raw.cantidadNominal ?? raw.cantidad_nominal ?? 0),
      porcentaje_merma: Number(raw.porcentajeMerma ?? raw.porcentaje_merma ?? 0),
      cantidad_neta: Number(raw.cantidadNeta ?? raw.cantidad_neta ?? 0),
      costo_unitario_compra: Number(raw.costoUnitarioCompra ?? raw.costo_unitario_compra ?? 0),
      monto_total_movimiento: Number(raw.montoTotalMovimiento ?? raw.monto_total_movimiento ?? 0),
      documento_referencia: raw.documentoReferencia ?? raw.documento_referencia ?? ''
    };
  }

  private normalizarAlerta(raw: any): AlertaStock {
    return {
      id_alerta: raw.idAlerta ?? raw.id_alerta ?? 0,
      id_insumo: raw.idInsumo ?? raw.id_insumo ?? 0,
      tipo_alerta: raw.tipoAlerta ?? raw.tipo_alerta ?? 'STOCK_MINIMO',
      mensaje: raw.mensaje ?? '',
      fecha_emision: raw.fechaEmision ?? raw.fecha_emision ?? '',
      estado: raw.estado ?? 'ABIERTA',
      insumo: raw.insumo
        ? {
            id_insumo: raw.insumo.idInsumo ?? raw.insumo.id_insumo,
            codigo_insumo: raw.insumo.codigoInsumo ?? raw.insumo.codigo_insumo,
            nombre: raw.insumo.nombre,
            unidad_medida: raw.insumo.unidadMedida ?? raw.insumo.unidad_medida,
            stock_actual: Number(raw.insumo.stockActual ?? raw.insumo.stock_actual ?? 0),
            stock_minimo_alerta: Number(raw.insumo.stockMinimoAlerta ?? raw.insumo.stock_minimo_alerta ?? 0)
          }
        : undefined
    };
  }
}

