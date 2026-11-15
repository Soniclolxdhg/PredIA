import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { VENTAS_ENDPOINTS } from '../constants/ventas.endpoints';
import {
  CrearClienteDto,
  ActualizarClienteDto,
  EmitirNotaVentaDto,
  ActualizarDespachoDto,
  StockDisponibleDto,
  MetricasVentasDto
} from '../models/dtos';

/**
 * Servicio Especializado de Comunicación API para el Módulo Comercial & Ventas (Fase 5: HU08, HU10).
 * Maneja clientes, stock disponible de cosecha, notas de venta, cálculo de márgenes y despacho.
 */
@Injectable({
  providedIn: 'root'
})
export class VentasApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  // ==========================================
  // 1. DIRECTORIO DE CLIENTES (HU08)
  // ==========================================

  crearCliente(dto: CrearClienteDto): Observable<any> {
    const url = `${this.baseUrl}${VENTAS_ENDPOINTS.CLIENTES}`;
    console.log(`[VentasApiService] POST ${VENTAS_ENDPOINTS.CLIENTES} payload:`, dto);

    return this.http.post(url, dto).pipe(
      tap((res) => console.log('✅ Cliente registrado en backend:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${VENTAS_ENDPOINTS.CLIENTES}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  listarClientes(busqueda?: string): Observable<any[]> {
    let url = `${this.baseUrl}${VENTAS_ENDPOINTS.CLIENTES}`;
    if (busqueda && busqueda.trim()) {
      url += `?busqueda=${encodeURIComponent(busqueda.trim())}`;
    }

    return this.http.get<any[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${VENTAS_ENDPOINTS.CLIENTES}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  obtenerCliente(id: number): Observable<any> {
    const endpoint = VENTAS_ENDPOINTS.CLIENTE_DETALLE(id);
    const url = `${this.baseUrl}${endpoint}`;

    return this.http.get<any>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  actualizarCliente(id: number, dto: ActualizarClienteDto): Observable<any> {
    const endpoint = VENTAS_ENDPOINTS.CLIENTE_DETALLE(id);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[VentasApiService] PATCH ${endpoint} payload:`, dto);

    return this.http.patch(url, dto).pipe(
      tap((res) => console.log(`✅ Cliente #${id} actualizado:`, res)),
      catchError((err) => {
        console.error(`❌ [PATCH ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  eliminarCliente(id: number): Observable<any> {
    const endpoint = VENTAS_ENDPOINTS.CLIENTE_DETALLE(id);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[VentasApiService] DELETE ${endpoint}`);

    return this.http.delete(url).pipe(
      tap(() => console.log(`✅ Cliente #${id} eliminado.`)),
      catchError((err) => {
        console.error(`❌ [DELETE ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 2. STOCK DISPONIBLE (HU10)
  // ==========================================

  obtenerStockDisponible(): Observable<StockDisponibleDto[]> {
    const url = `${this.baseUrl}${VENTAS_ENDPOINTS.STOCK_DISPONIBLE}`;

    return this.http.get<StockDisponibleDto[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${VENTAS_ENDPOINTS.STOCK_DISPONIBLE}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 3. NOTAS DE VENTA & MARGEN OPERATIVO (HU10)
  // ==========================================

  emitirNotaVenta(dto: EmitirNotaVentaDto): Observable<any> {
    const url = `${this.baseUrl}${VENTAS_ENDPOINTS.NOTAS_VENTA}`;
    console.log(`[VentasApiService] POST ${VENTAS_ENDPOINTS.NOTAS_VENTA} payload:`, dto);

    return this.http.post(url, dto).pipe(
      tap((res) => console.log('✅ Nota de venta emitida:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${VENTAS_ENDPOINTS.NOTAS_VENTA}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  listarNotasVenta(filtros?: {
    idCliente?: number;
    estadoDespacho?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Observable<any[]> {
    let url = `${this.baseUrl}${VENTAS_ENDPOINTS.NOTAS_VENTA}`;
    const params: string[] = [];
    if (filtros?.idCliente) params.push(`idCliente=${filtros.idCliente}`);
    if (filtros?.estadoDespacho && filtros.estadoDespacho !== 'TODAS') {
      params.push(`estadoDespacho=${filtros.estadoDespacho}`);
    }
    if (filtros?.fechaDesde) params.push(`fechaDesde=${filtros.fechaDesde}`);
    if (filtros?.fechaHasta) params.push(`fechaHasta=${filtros.fechaHasta}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${VENTAS_ENDPOINTS.NOTAS_VENTA}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  actualizarDespacho(id: number, dto: ActualizarDespachoDto): Observable<any> {
    const endpoint = VENTAS_ENDPOINTS.VENTA_DESPACHO(id);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[VentasApiService] PATCH ${endpoint} payload:`, dto);

    return this.http.patch(url, dto).pipe(
      tap((res) => console.log(`✅ Despacho de venta #${id} actualizado:`, res)),
      catchError((err) => {
        console.error(`❌ [PATCH ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  obtenerMetricas(): Observable<MetricasVentasDto> {
    const url = `${this.baseUrl}${VENTAS_ENDPOINTS.METRICAS}`;

    return this.http.get<MetricasVentasDto>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${VENTAS_ENDPOINTS.METRICAS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }
}

