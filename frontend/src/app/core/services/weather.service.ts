import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HistoricoClima } from '../models/erp.models';
import { ClimaApiService } from './clima-api.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly climaApi = inject(ClimaApiService);

  // Señal reactiva con el pronóstico de los próximos 7 días
  readonly pronostico7Dias = signal<HistoricoClima[]>(this.generarPronosticoBase());
  readonly alertaHeladaActiva = signal<boolean>(false);
  readonly modoOffline = signal<boolean>(false);
  readonly alertaHeladaDetalle = signal<any | null>(null);

  constructor() {
    this.cargarPronostico();
  }

  cargarPronostico(): void {
    // 1. Intentar consultar endpoint oficial del backend
    this.climaApi.obtenerPronostico().subscribe({
      next: (res) => {
        if (res && res.pronostico && res.pronostico.length > 0) {
          const dias: HistoricoClima[] = res.pronostico.map((p, idx) => ({
            id_registro_clima: p.idRegistroClima || idx + 1,
            fecha_pronostico: p.fecha,
            temp_minima_c: p.tempMinimaC,
            temp_maxima_c: p.tempMaximaC,
            probabilidad_precipitacion_pct: p.probabilidadPrecipitacionPct,
            riesgo_helada: p.riesgoHelada
          }));

          this.pronostico7Dias.set(dias);
          this.alertaHeladaActiva.set(res.diasConRiesgoHelada > 0);
          const alerta = res.pronostico.find((p) => p.alertaHelada)?.alertaHelada;
          if (alerta) {
            this.alertaHeladaDetalle.set(alerta);
          }
          return;
        }
        this.consultarOpenMeteoDirecto();
      },
      error: () => {
        this.consultarOpenMeteoDirecto();
      }
    });
  }

  private consultarOpenMeteoDirecto(): void {
    // Coordenadas agrícolas Santa Laura Ltda.
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-33.81&longitude=-70.74&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto';

    this.http.get<any>(url).pipe(
      map((res) => {
        if (!res?.daily?.time) throw new Error('Respuesta meteorológica inválida');
        const dias: HistoricoClima[] = [];
        let hayHelada = false;

        for (let i = 0; i < res.daily.time.length; i++) {
          const tMin = Number(res.daily.temperature_2m_min[i]);
          const tMax = Number(res.daily.temperature_2m_max[i]);
          const precip = Number(res.daily.precipitation_probability_max[i] ?? 0);
          const riesgo = tMin < 2.0;
          if (riesgo) hayHelada = true;

          dias.push({
            id_registro_clima: i + 1,
            fecha_pronostico: res.daily.time[i],
            temp_minima_c: tMin,
            temp_maxima_c: tMax,
            probabilidad_precipitacion_pct: precip,
            riesgo_helada: riesgo
          });
        }
        return { dias, hayHelada };
      }),
      catchError(() => {
        this.modoOffline.set(true);
        const base = this.generarPronosticoBase();
        return of({ dias: base, hayHelada: base.some((d) => d.riesgo_helada) });
      })
    ).subscribe((resultado) => {
      this.pronostico7Dias.set(resultado.dias);
      this.alertaHeladaActiva.set(resultado.hayHelada);
    });
  }

  simularHelada(forzar: boolean): void {
    const listaActual = [...this.pronostico7Dias()];
    if (forzar) {
      if (listaActual.length > 0) {
        listaActual[0] = {
          ...listaActual[0],
          temp_minima_c: -1.2,
          temp_maxima_c: 14.5,
          riesgo_helada: true
        };
      }
      this.alertaHeladaActiva.set(true);
    } else {
      if (listaActual.length > 0) {
        listaActual[0] = {
          ...listaActual[0],
          temp_minima_c: 6.5,
          temp_maxima_c: 22.0,
          riesgo_helada: false
        };
      }
      this.alertaHeladaActiva.set(listaActual.some((d) => d.riesgo_helada));
    }
    this.pronostico7Dias.set(listaActual);
  }

  private generarPronosticoBase(): HistoricoClima[] {
    const hoy = new Date();
    const mock: HistoricoClima[] = [];
    const minTemperaturas = [6.2, 5.0, 1.4, 4.8, 7.1, 8.5, 9.0];
    const maxTemperaturas = [23.5, 21.0, 18.2, 22.4, 25.0, 26.1, 24.8];
    const probabilidadesLluvia = [0, 5, 45, 10, 0, 0, 15];

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const tMin = minTemperaturas[i];
      const tMax = maxTemperaturas[i];
      const precip = probabilidadesLluvia[i];
      const esHelada = tMin < 2.0;

      mock.push({
        id_registro_clima: i + 1,
        fecha_pronostico: fecha.toISOString().split('T')[0],
        temp_minima_c: tMin,
        temp_maxima_c: tMax,
        probabilidad_precipitacion_pct: precip,
        riesgo_helada: esHelada
      });
    }

    return mock;
  }
}
