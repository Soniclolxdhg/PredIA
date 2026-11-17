import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CLIMA_ENDPOINTS } from '../constants/clima.endpoints';
import {
  PronosticoClimaResponseDto,
  SincronizarClimaDto,
  AlertaHeladaDto,
  AtenderAlertaHeladaDto
} from '../models/dtos';

/**
 * Servicio Especializado de Comunicación API para el Módulo Agroclimático & Heladas (HU12).
 * Gestiona pronósticos a 7 días sincronizados con Open-Meteo y alertas de heladas (< 2.0°C).
 */
@Injectable({
  providedIn: 'root'
})
export class ClimaApiService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private get baseUrl(): string {
    return this.authService.baseUrl();
  }

  obtenerPronostico(): Observable<PronosticoClimaResponseDto> {
    const url = `${this.baseUrl}${CLIMA_ENDPOINTS.PRONOSTICO}`;
    return this.http.get<PronosticoClimaResponseDto>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${CLIMA_ENDPOINTS.PRONOSTICO}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  sincronizarClima(dto?: SincronizarClimaDto): Observable<any> {
    const url = `${this.baseUrl}${CLIMA_ENDPOINTS.SINCRONIZAR}`;
    console.log(`[ClimaApiService] POST ${CLIMA_ENDPOINTS.SINCRONIZAR}`);

    return this.http.post(url, dto || {}).pipe(
      tap((res) => console.log('✅ Pronóstico agroclimático sincronizado con Open-Meteo:', res)),
      catchError((err) => {
        console.error(`❌ [POST ${CLIMA_ENDPOINTS.SINCRONIZAR}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  listarAlertas(soloAbiertas?: boolean): Observable<AlertaHeladaDto[]> {
    let url = `${this.baseUrl}${CLIMA_ENDPOINTS.ALERTAS}`;
    if (soloAbiertas) {
      url += `?soloAbiertas=true`;
    }

    return this.http.get<AlertaHeladaDto[]>(url).pipe(
      catchError((err) => {
        console.error(`❌ [GET ${CLIMA_ENDPOINTS.ALERTAS}] Error:`, err);
        return throwError(() => err);
      })
    );
  }

  atenderAlerta(idAlerta: number, dto?: AtenderAlertaHeladaDto): Observable<any> {
    const endpoint = CLIMA_ENDPOINTS.ATENDER_ALERTA(idAlerta);
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[ClimaApiService] PATCH ${endpoint}`);

    return this.http.patch(url, {}).pipe(
      tap((res) => console.log(`✅ Alerta de helada #${idAlerta} atendida en backend:`, res)),
      catchError((err) => {
        console.error(`❌ [PATCH ${endpoint}] Error:`, err);
        return throwError(() => err);
      })
    );
  }
}
