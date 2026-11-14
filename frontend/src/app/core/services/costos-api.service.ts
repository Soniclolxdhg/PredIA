import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { COSTOS_ENDPOINTS } from '../constants/costos.endpoints';
import {
  CrearAsistenciaDto,
  ActualizarEstadoPagoDto,
  ProrratearCostoIndirectoDto,
  LiquidacionCicloResponse
} from '../models/dtos';

/**
 * Servicio Especializado de Comunicación API para el Módulo de Costos & Mano de Obra (HU06, HU07, HU09).
 * Conecta con los endpoints REST del backend NestJS para liquidación de asistencias, prorrateo de indirectos y consolidación.
 */
@Injectable({
  providedIn: 'root'
})
export class CostosApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  // ==========================================
  // 1. ASISTENCIA & MANO DE OBRA (HU06)
  // ==========================================

  registrarAsistencia(dto: CrearAsistenciaDto): Observable<any> {
    const url = `${this.baseUrl}${COSTOS_ENDPOINTS.ASISTENCIAS}`;
    console.log(`[CostosApiService] POST ${COSTOS_ENDPOINTS.ASISTENCIAS} payload:`, dto);

    return this.http.post(url, dto).pipe(
      tap((res) => console.log('✅ Asistencia registrada en backend:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${COSTOS_ENDPOINTS.ASISTENCIAS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  listarAsistencias(idCiclo?: number, estadoPago?: string): Observable<any[]> {
    let url = `${this.baseUrl}${COSTOS_ENDPOINTS.ASISTENCIAS}`;
    const params: string[] = [];
    if (idCiclo) params.push(`idCiclo=${idCiclo}`);
    if (estadoPago) params.push(`estadoPago=${estadoPago}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${COSTOS_ENDPOINTS.ASISTENCIAS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  actualizarEstadoPago(id: number, dto: ActualizarEstadoPagoDto): Observable<any> {
    const endpoint = COSTOS_ENDPOINTS.ESTADO_PAGO(id);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[CostosApiService] PATCH ${endpoint} payload:`, dto);

    return this.http.patch(url, dto).pipe(
      tap((res) => console.log('✅ Estado de pago actualizado:', res)),
      catchError((err) => {
        console.error(`❌ [PATCH ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 2. PRORRATEO COSTOS INDIRECTOS (HU07)
  // ==========================================

  prorratearGastoIndirecto(dto: ProrratearCostoIndirectoDto): Observable<any> {
    const url = `${this.baseUrl}${COSTOS_ENDPOINTS.INDIRECTOS_PRORRATEAR}`;
    console.log(`[CostosApiService] POST ${COSTOS_ENDPOINTS.INDIRECTOS_PRORRATEAR} payload:`, dto);

    return this.http.post(url, dto).pipe(
      tap((res) => console.log('✅ Costo indirecto prorrateado en backend:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${COSTOS_ENDPOINTS.INDIRECTOS_PRORRATEAR}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 3. CONSOLIDADO Y LIQUIDACIÓN (HU09)
  // ==========================================

  obtenerLiquidacionCiclo(idCiclo: number): Observable<LiquidacionCicloResponse> {
    const endpoint = COSTOS_ENDPOINTS.LIQUIDACION(idCiclo);
    const url = `${this.baseUrl}${endpoint}`;

    return this.http.get<LiquidacionCicloResponse>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  consolidarLiquidacionCiclo(idCiclo: number): Observable<any> {
    const endpoint = COSTOS_ENDPOINTS.CONSOLIDAR(idCiclo);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[CostosApiService] POST ${endpoint}`);

    return this.http.post(url, {}).pipe(
      tap((res) => console.log('✅ Liquidación consolidada:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }
}

