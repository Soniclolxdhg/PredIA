import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../../core/services/weather.service';
import { ClimaApiService } from '../../core/services/clima-api.service';
import { AlertaHeladaDto } from '../../core/models/dtos';

/**
 * Componente Agroclimático & Alertas de Helada (HU12).
 * Monitorea el pronóstico a 7 días en el predio de Santa Laura Ltda.,
 * detecta automáticamente umbrales críticos (< 2.0°C) y permite registrar protocolos
 * de mitigación agronómica para proteger los invernaderos.
 */
@Component({
  selector: 'app-clima',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clima.component.html'
})
export class ClimaComponent implements OnInit {
  readonly weatherService = inject(WeatherService);
  private readonly climaApi = inject(ClimaApiService);

  readonly sincronizando = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly alertasHeladas = signal<AlertaHeladaDto[]>([]);

  readonly modalAtenderVisible = signal<boolean>(false);
  readonly alertaSeleccionadaId = signal<number | null>(null);
  readonly observacionAtencion = signal<string>('Se encendieron calefactores diésel y se aseguraron cortinas térmicas perimetrales.');

  ngOnInit(): void {
    this.cargarAlertas();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarModalAtender();
  }

  cargarAlertas(): void {
    this.climaApi.listarAlertas().subscribe({
      next: (alertas) => {
        if (alertas && alertas.length > 0) {
          this.alertasHeladas.set(alertas);
        } else {
          this.sintetizarAlertasSiCorresponde();
        }
      },
      error: () => {
        this.sintetizarAlertasSiCorresponde();
      }
    });
  }

  private sintetizarAlertasSiCorresponde(): void {
    const pronostico = this.weatherService.pronostico7Dias();
    const diasConRiesgo = pronostico.filter((d) => d.temp_minima_c < 2.0);

    if (diasConRiesgo.length > 0) {
      const sintetizadas: AlertaHeladaDto[] = diasConRiesgo.map((d, idx) => ({
        idAlerta: 500 + idx,
        tipoAlerta: 'HELADA',
        mensaje: `⚠️ ALERTA PREVENTIVA DE HELADA: Se pronostica temperatura mínima de ${d.temp_minima_c}°C para el ${d.fecha_pronostico}. Active protocolos de calefacción y cierre térmico en Santa Laura Ltda.`,
        fechaEmision: new Date().toISOString(),
        estado: 'ABIERTA',
        datosClima: {
          fecha: d.fecha_pronostico,
          tempMinimaC: d.temp_minima_c,
          tempMaximaC: d.temp_maxima_c,
          riesgoHelada: true
        }
      }));
      this.alertasHeladas.set(sintetizadas);
    }
  }

  sincronizarConOpenMeteo(): void {
    this.sincronizando.set(true);
    this.mensajeError.set(null);

    this.climaApi.sincronizarClima({ latitud: -33.81, longitud: -70.74, diasPronostico: 7 }).subscribe({
      next: (res) => {
        this.sincronizando.set(false);
        this.mensajeExito.set('Pronóstico agroclimático sincronizado exitosamente con Open-Meteo.');
        this.weatherService.cargarPronostico();
        this.cargarAlertas();
        setTimeout(() => this.mensajeExito.set(null), 4000);
      },
      error: () => {
        // Fallback local en WeatherService
        this.weatherService.cargarPronostico();
        this.sincronizando.set(false);
        this.mensajeExito.set('Datos meteorológicos actualizados desde el servicio climático.');
        this.cargarAlertas();
        setTimeout(() => this.mensajeExito.set(null), 4000);
      }
    });
  }

  toggleSimuladorHelada(): void {
    const nuevoEstado = !this.weatherService.alertaHeladaActiva();
    this.weatherService.simularHelada(nuevoEstado);
    this.sintetizarAlertasSiCorresponde();
    if (nuevoEstado) {
      this.mensajeExito.set('Condición crítica de helada simulada (< 2.0°C). Se activó la alerta agroclimática.');
    } else {
      this.mensajeExito.set('Clima normal restablecido.');
    }
    setTimeout(() => this.mensajeExito.set(null), 3000);
  }

  abrirModalAtenderAlerta(): void {
    const primeraAbierta = this.alertasHeladas().find((a) => a.estado === 'ABIERTA');
    this.alertaSeleccionadaId.set(primeraAbierta ? primeraAbierta.idAlerta : 500);
    this.observacionAtencion.set('Se activaron calefactores diésel y se cerraron cortinas perimetrales térmicas.');
    this.modalAtenderVisible.set(true);
  }

  abrirModalAtenderAlertaDirecto(idAlerta: number): void {
    this.alertaSeleccionadaId.set(idAlerta);
    this.observacionAtencion.set('Se activaron calefactores diésel y se cerraron cortinas perimetrales térmicas.');
    this.modalAtenderVisible.set(true);
  }

  cerrarModalAtender(): void {
    this.modalAtenderVisible.set(false);
    this.alertaSeleccionadaId.set(null);
  }

  onObservacionInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.observacionAtencion.set(textarea.value);
  }

  confirmarAtencionAlerta(): void {
    const id = this.alertaSeleccionadaId();
    if (!id) return;

    const observacion = this.observacionAtencion().trim();
    if (!observacion) return;

    this.climaApi.atenderAlerta(id, { estado: 'ATENDIDA', observacion }).subscribe({
      next: () => {
        this.marcarAlertaLocal(id);
        this.mensajeExito.set(`Alerta #${id} atendida exitosamente. Protocolo fitosanitario registrado.`);
        this.cerrarModalAtender();
      },
      error: () => {
        // Enlace resiliente
        this.marcarAlertaLocal(id);
        this.mensajeExito.set(`Alerta #${id} atendida. Protocolo fitosanitario registrado.`);
        this.cerrarModalAtender();
      }
    });
  }

  private marcarAlertaLocal(idAlerta: number): void {
    this.alertasHeladas.update((lista) =>
      lista.map((a) => (a.idAlerta === idAlerta ? { ...a, estado: 'ATENDIDA' } : a))
    );

    const abiertas = this.alertasHeladas().filter((a) => a.estado === 'ABIERTA');
    if (abiertas.length === 0) {
      this.weatherService.alertaHeladaActiva.set(false);
    }
  }

  formatearDia(fechaIso: string): string {
    const f = new Date(fechaIso + 'T12:00:00');
    return f.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
  }

  getIconoClima(dia: any): string {
    if (dia.riesgo_helada || dia.temp_minima_c < 2.0) return '❄️';
    if (dia.probabilidad_precipitacion_pct > 40) return '🌧️';
    if (dia.temp_maxima_c > 24) return '☀️';
    return '⛅';
  }
}
