import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../../core/services/weather.service';

@Component({
  selector: 'app-clima',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Switch de Simulación de Helada -->
      <div class="bg-gradient-to-r from-sky-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-sky-400">Estación Agroclimática Open-Meteo REST API</span>
          <h2 class="text-xl font-bold flex items-center gap-2 mt-0.5">
            <span>⛅</span>
            <span>Pronóstico Agroclimático & Alertas de Helada (HU11/12)</span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 mt-1">
            Monitoreo térmico predictivo para protección de naves e invernaderos en Santa Laura Ltda.
          </p>
        </div>

        <!-- Control de simulación de contingencia climática -->
        <div class="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-xs self-start md:self-auto border border-white/20">
          <span class="text-xs font-bold text-sky-200 pl-2">SIMULADOR HU12:</span>
          <button
            type="button"
            (click)="weatherService.simularHelada(!weatherService.alertaHeladaActiva())"
            [class]="weatherService.alertaHeladaActiva() ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'"
            class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
            <span>{{ weatherService.alertaHeladaActiva() ? '❄️ Helada Forzada (<2°C)' : '☀️ Clima Normal' }}</span>
          </button>
        </div>
      </div>

      <!-- TARJETA DESTACADA: ALERTA PREVENTIVA DE HELADA (HU12) -->
      <div
        *ngIf="weatherService.alertaHeladaActiva()"
        class="bg-rose-600 text-white p-6 rounded-2xl shadow-lg border-2 border-rose-300 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="text-4xl p-2 bg-white/20 rounded-2xl">❄️</div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase tracking-widest bg-white text-rose-800 px-2 py-0.5 rounded font-mono">
                ALERTA AGROCLIMÁTICA CRÍTICA
              </span>
              <span class="text-xs font-bold text-rose-100">&lt; 2.0 °C DETECTADO</span>
            </div>
            <h3 class="text-lg font-black mt-1">Riesgo Inminente de Helada Agrícola en Invernaderos</h3>
            <p class="text-xs sm:text-sm text-rose-100 mt-1 max-w-2xl">
              Protocolo fitosanitario activado: Cierre hermético de cortinas térmicas en naves, encendido de calefactores y activación de riego anti-helada preventivo.
            </p>
          </div>
        </div>
        <div class="bg-rose-950/40 p-3 rounded-xl border border-rose-400/40 text-center text-xs self-start md:self-auto">
          <div class="font-bold text-rose-200">Umbral de Helada:</div>
          <div class="text-xl font-black font-mono text-white">&lt; 2.0 °C</div>
        </div>
      </div>

      <!-- Tarjetas del Pronóstico a 7 Días -->
      <div>
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
          <span>Pronóstico Agroclimático Extendido (7 Días)</span>
          <span class="text-xs font-normal text-slate-400">Lat: -33.66 &bull; Lon: -70.93</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div
            *ngFor="let dia of weatherService.pronostico7Dias()"
            [class]="dia.riesgo_helada ? 'border-2 border-rose-500 bg-rose-50/70 shadow-md' : 'border border-slate-200 bg-white'"
            class="p-4 rounded-2xl flex flex-col justify-between transition-shadow hover:shadow-md">
            <div>
              <div class="flex items-center justify-between text-xs text-slate-500 font-mono mb-2">
                <span>{{ formatearDia(dia.fecha_pronostico) }}</span>
                <span class="text-base">{{ getIconoClima(dia) }}</span>
              </div>

              <div class="text-xs font-semibold text-slate-700 truncate mb-2">
                {{ dia.fecha_pronostico }}
              </div>

              <div class="space-y-1.5 my-3">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500">Mín:</span>
                  <span
                    [class]="dia.temp_minima_c < 2 ? 'text-rose-600 font-black font-mono text-sm' : 'font-bold font-mono text-slate-800'">
                    {{ dia.temp_minima_c }}°C
                  </span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500">Máx:</span>
                  <span class="font-bold font-mono text-slate-800">{{ dia.temp_maxima_c }}°C</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-500">Lluvia:</span>
                  <span class="font-mono text-sky-600 font-semibold">{{ dia.probabilidad_precipitacion_pct }}%</span>
                </div>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 text-center">
              <span
                *ngIf="dia.riesgo_helada; else normalClima"
                class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                RIESGO HELADA
              </span>
              <ng-template #normalClima>
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Condición Normal
                </span>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClimaComponent {
  readonly weatherService = inject(WeatherService);

  formatearDia(fechaIso: string): string {
    const f = new Date(fechaIso + 'T12:00:00');
    return f.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
  }

  getIconoClima(dia: any): string {
    if (dia.riesgo_helada) return '❄️';
    if (dia.probabilidad_precipitacion_pct > 40) return '🌧️';
    if (dia.temp_maxima_c > 24) return '☀️';
    return '⛅';
  }
}

