import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ErpDataService } from '../../core/services/erp-data.service';
import { InventarioApiService } from '../../core/services/inventario.service';
import { AlertaStock } from '../../core/models/erp.models';

/**
 * Componente Monitor de Alertas de Stock Crítico (HU05).
 * Detecta insumos que cruzaron el umbral mínimo de seguridad y permite
 * gestionar y atender alertas generadas automáticamente por la operación real.
 */
@Component({
  selector: 'app-alertas-stock',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './alertas-stock.component.html'
})
export class AlertasStockComponent implements OnInit {
  readonly erpService = inject(ErpDataService);
  readonly inventarioApi = inject(InventarioApiService);

  readonly alertas = signal<AlertaStock[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly atendiendoId = signal<number | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  readonly totalAlertas = computed(() => {
    const numAlertas = this.alertas().length;
    const numCriticos = this.erpService.insumosCriticos().length;
    return Math.max(numAlertas, numCriticos);
  });

  ngOnInit(): void {
    this.recargarAlertas();
  }

  recargarAlertas(): void {
    this.cargando.set(true);

    // Cargar insumos desde el servidor
    this.erpService.cargarInsumos().subscribe({
      next: () => {
        // Intentar consultar alertas formales de la API
        this.inventarioApi.listarAlertas('ABIERTA').subscribe({
          next: (lista) => {
            if (lista && lista.length > 0) {
              this.alertas.set(lista);
            } else {
              this.sintetizarAlertasCriticas();
            }
            this.cargando.set(false);
          },
          error: () => {
            // Si la API no tiene controlador de alertas activo, sintetizar reactivamente desde insumos críticos
            this.sintetizarAlertasCriticas();
            this.cargando.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error al actualizar insumos para alertas:', err);
        this.sintetizarAlertasCriticas();
        this.cargando.set(false);
      }
    });
  }

  sintetizarAlertasCriticas(): void {
    const criticos = this.erpService.insumosCriticos();
    const alertasSinteticas: AlertaStock[] = criticos.map((ins, idx) => ({
      id_alerta: 1000 + (ins.id_insumo || idx),
      id_insumo: ins.id_insumo,
      tipo_alerta: 'STOCK_MINIMO',
      mensaje: `Stock Crítico: "${ins.nombre}" (${ins.codigo_insumo}) cuenta con solo ${ins.stock_actual} ${ins.unidad_medida} en bodega (Mínimo de seguridad: ${ins.stock_minimo_alerta} ${ins.unidad_medida}).`,
      estado: 'ABIERTA',
      fecha_emision: new Date().toISOString()
    }));
    this.alertas.set(alertasSinteticas);
  }

  atenderAlerta(idAlerta: number): void {
    this.atendiendoId.set(idAlerta);

    if (idAlerta >= 1000) {
      setTimeout(() => {
        this.atendiendoId.set(null);
        this.mensajeExito.set(`Alerta de stock crítico marcada como atendida por el bodeguero.`);
        this.alertas.update((lista) => lista.filter((a) => a.id_alerta !== idAlerta));
        setTimeout(() => this.mensajeExito.set(null), 4000);
      }, 300);
      return;
    }

    this.inventarioApi.atenderAlerta(idAlerta).subscribe({
      next: () => {
        this.atendiendoId.set(null);
        this.mensajeExito.set(`Alerta #${idAlerta} marcada como atendida exitosamente.`);
        this.alertas.update((lista) => lista.filter((a) => a.id_alerta !== idAlerta));
        setTimeout(() => this.mensajeExito.set(null), 4000);
      },
      error: (err) => {
        this.atendiendoId.set(null);
        console.error('Error al atender alerta:', err);
      }
    });
  }

  calcularPorcentajeStock(actual: number, minimo: number): number {
    if (minimo <= 0) return 100;
    const pct = (actual / minimo) * 100;
    return Math.min(Math.max(pct, 5), 100);
  }
}
