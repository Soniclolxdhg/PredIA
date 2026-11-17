import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { DASHBOARD_ENDPOINTS } from '../constants/dashboard.endpoints';
import {
  DashboardEjecutivoResponse,
  DashboardKpisDto,
  DashboardGraficosDto,
  ProyeccionCicloDto
} from '../models/dtos';

/**
 * Servicio Especializado de Comunicación API para el Dashboard Ejecutivo & Analytics (HU11).
 * Conecta con los endpoints REST del backend NestJS para obtener KPIs directivos,
 * datasets para Chart.js y proyecciones predictivas de rendimiento y riesgo.
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  obtenerConsolidadoEjecutivo(): Observable<DashboardEjecutivoResponse> {
    const url = `${this.baseUrl}${DASHBOARD_ENDPOINTS.EJECUTIVO}`;
    return this.http.get<DashboardEjecutivoResponse>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${DASHBOARD_ENDPOINTS.EJECUTIVO}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  obtenerKpis(): Observable<DashboardKpisDto> {
    const url = `${this.baseUrl}${DASHBOARD_ENDPOINTS.KPIS}`;
    return this.http.get<DashboardKpisDto>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${DASHBOARD_ENDPOINTS.KPIS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  obtenerGraficos(): Observable<DashboardGraficosDto> {
    const url = `${this.baseUrl}${DASHBOARD_ENDPOINTS.GRAFICOS}`;
    return this.http.get<DashboardGraficosDto>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${DASHBOARD_ENDPOINTS.GRAFICOS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  obtenerProyecciones(): Observable<ProyeccionCicloDto[]> {
    const url = `${this.baseUrl}${DASHBOARD_ENDPOINTS.PROYECCIONES}`;
    return this.http.get<ProyeccionCicloDto[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${DASHBOARD_ENDPOINTS.PROYECCIONES}] Error:`, err);
        return throwError(() => err);
      })
    );
  }
}
