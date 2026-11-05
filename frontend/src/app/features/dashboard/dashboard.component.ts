import { Component, AfterViewInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ErpDataService } from '../../core/services/erp-data.service';
import { WeatherService } from '../../core/services/weather.service';
import { AuthService } from '../../core/services/auth.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements AfterViewInit {
  readonly erpService = inject(ErpDataService);
  readonly weatherService = inject(WeatherService);
  readonly authService = inject(AuthService);

  @ViewChild('barChartCanvas') barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly perfilRespuesta = signal<string | null>(null);

  ngAfterViewInit(): void {
    setTimeout(() => this.iniciarGraficos(), 100);
  }

  iniciarGraficos(): void {
    if (!this.barChartCanvas || !this.lineChartCanvas) return;

    // 1. Gráfico de Barras: Costos vs Ingresos por Ciclo
    const ciclos = this.erpService.ciclos();
    const etiquetas = ciclos.map((c) => `Ciclo #${c.id_ciclo} (${c.variedad})`);
    const dataCostos = ciclos.map((c) => c.costo_total_acumulado);
    const dataIngresos = ciclos.map((c) => {
      const vCiclo = this.erpService.ventas().filter((v) => v.id_cosecha === c.id_ciclo);
      return vCiclo.length > 0
        ? vCiclo.reduce((acc, v) => acc + v.monto_total_ingreso, 0)
        : Math.round(c.costo_total_acumulado * 1.45);
    });

    new Chart(this.barChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Costo Total Acumulado ($)',
            data: dataCostos,
            backgroundColor: '#047857',
            borderRadius: 8
          },
          {
            label: 'Ingreso Estimado por Ventas ($)',
            data: dataIngresos,
            backgroundColor: '#10b981',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => '$' + Number(value).toLocaleString('es-CL')
            }
          }
        }
      }
    });

    // 2. Gráfico de Líneas: Rendimiento de Kilos por Nave
    const naves = this.erpService.naves();
    const etiquetasNaves = naves.map((n) => `${n.codigo_nave}`);
    const kilosPorNave = naves.map((n) => {
      const ciclo = ciclos.find((c) => c.id_nave === n.id_nave);
      return ciclo ? ciclo.total_kg_cosechados : 0;
    });

    new Chart(this.lineChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: etiquetasNaves,
        datasets: [
          {
            label: 'Kilos Netos Cosechados (Kg)',
            data: kilosPorNave,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointBackgroundColor: '#0284c7'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => Number(value).toLocaleString('es-CL') + ' Kg'
            }
          }
        }
      }
    });
  }

  formatearDia(fechaIso: string): string {
    const f = new Date(fechaIso + 'T12:00:00');
    return f.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
  }

  testToken(): void {
    this.authService.obtenerPerfil().subscribe({
      next: (res) => this.perfilRespuesta.set(JSON.stringify(res, null, 2)),
      error: (err) => this.perfilRespuesta.set(`Error ${err.status}: ${JSON.stringify(err.error || err.message)}`)
    });
  }
}
