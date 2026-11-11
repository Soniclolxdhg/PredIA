import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { PRODUCCION_ENDPOINTS } from '../constants/produccion.endpoints';
import {
  CrearNaveDto,
  ActualizarNaveDto,
  CrearCicloDto,
  CerrarCicloDto,
  CrearLaborDto,
  CrearCosechaDto
} from '../models/dtos';

/**
 * Servicio Especializado de Comunicación API para el Módulo de Producción (HU01, HU02, HU03).
 * Utiliza los DTOs oficiales, endpoints centralizados y emite trazabilidad (console.log)
 * de todas las operaciones POST y PATCH enviadas al backend.
 */
@Injectable({
  providedIn: 'root'
})
export class ProduccionApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  // ==========================================
  // 1. GESTIÓN DE NAVES / INVERNADEROS (HU01)
  // ==========================================

  listarNaves(): Observable<any[]> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.NAVES}`;
    return this.http.get<any[]>(url);
  }

  obtenerNavePorId(id: number): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.NAVE_POR_ID(id)}`;
    return this.http.get<any>(url);
  }

  crearNave(dto: CrearNaveDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.NAVES}`;
    console.log(`📤 [POST ${PRODUCCION_ENDPOINTS.NAVES}] Enviando información de nueva nave:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${PRODUCCION_ENDPOINTS.NAVES}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${PRODUCCION_ENDPOINTS.NAVES}]:`, err);
        return throwError(() => err);
      })
    );
  }

  actualizarNave(id: number, dto: ActualizarNaveDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.NAVE_POR_ID(id)}`;
    console.log(`📤 [PATCH ${PRODUCCION_ENDPOINTS.NAVE_POR_ID(id)}] Actualizando nave #${id}:`, dto);

    return this.http.patch<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta PATCH nave #${id}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error PATCH nave #${id}]:`, err);
        return throwError(() => err);
      })
    );
  }

  sembrarNavesBase(): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.SEMBRAR_NAVES}`;
    console.log(`📤 [POST ${PRODUCCION_ENDPOINTS.SEMBRAR_NAVES}] Solicitando inicialización de 4 naves base`);

    return this.http.post<any>(url, {}).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${PRODUCCION_ENDPOINTS.SEMBRAR_NAVES}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${PRODUCCION_ENDPOINTS.SEMBRAR_NAVES}]:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 2. CICLOS DE CULTIVO (HU01)
  // ==========================================

  listarCiclos(idNave?: number, estado?: string): Observable<any[]> {
    let url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.CICLOS}`;
    const params: string[] = [];
    if (idNave) params.push(`idNave=${idNave}`);
    if (estado) params.push(`estado=${estado}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<any[]>(url);
  }

  obtenerCicloPorId(id: number): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.CICLO_POR_ID(id)}`;
    return this.http.get<any>(url);
  }

  crearCiclo(dto: CrearCicloDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.CICLOS}`;
    console.log(`📤 [POST ${PRODUCCION_ENDPOINTS.CICLOS}] Enviando información de apertura de ciclo:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${PRODUCCION_ENDPOINTS.CICLOS}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${PRODUCCION_ENDPOINTS.CICLOS}]:`, err);
        return throwError(() => err);
      })
    );
  }

  cerrarCiclo(idCiclo: number, dto: CerrarCicloDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.CERRAR_CICLO(idCiclo)}`;
    console.log(`📤 [PATCH ${PRODUCCION_ENDPOINTS.CERRAR_CICLO(idCiclo)}] Cerrando ciclo #${idCiclo}:`, dto);

    return this.http.patch<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta PATCH cerrar ciclo #${idCiclo}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error PATCH cerrar ciclo #${idCiclo}]:`, err);
        return throwError(() => err);
      })
    );
  }

  // ==========================================
  // 3. LABORES AGRÍCOLAS EN TERRENO (HU02)
  // ==========================================

  registrarLabor(dto: CrearLaborDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.LABORES}`;
    console.log(`📤 [POST ${PRODUCCION_ENDPOINTS.LABORES}] Enviando información de labor agrícola:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${PRODUCCION_ENDPOINTS.LABORES}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${PRODUCCION_ENDPOINTS.LABORES}]:`, err);
        return throwError(() => err);
      })
    );
  }

  listarLaboresPorCiclo(idCiclo: number): Observable<any[]> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.LABORES_POR_CICLO(idCiclo)}`;
    return this.http.get<any[]>(url);
  }

  // ==========================================
  // 4. PESAJE DE COSECHA (HU03)
  // ==========================================

  registrarCosecha(dto: CrearCosechaDto): Observable<any> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.COSECHAS}`;
    console.log(`📤 [POST ${PRODUCCION_ENDPOINTS.COSECHAS}] Enviando información de pesaje de cosecha:`, dto);

    return this.http.post<any>(url, dto).pipe(
      tap((res) => console.log(`📥 [Respuesta POST ${PRODUCCION_ENDPOINTS.COSECHAS}]:`, res)),
      catchError((err) => {
        console.error(`❌ [Error POST ${PRODUCCION_ENDPOINTS.COSECHAS}]:`, err);
        return throwError(() => err);
      })
    );
  }

  listarCosechasPorCiclo(idCiclo: number): Observable<any[]> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.COSECHAS_POR_CICLO(idCiclo)}`;
    return this.http.get<any[]>(url);
  }

  obtenerStockCosechasDisponibles(): Observable<any[]> {
    const url = `${this.baseUrl}${PRODUCCION_ENDPOINTS.COSECHAS_DISPONIBLES}`;
    return this.http.get<any[]>(url);
  }
}

