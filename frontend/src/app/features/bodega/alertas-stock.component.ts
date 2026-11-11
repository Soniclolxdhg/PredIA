import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ErpDataService } from '../../core/services/erp-data.service';
import { InventarioApiService } from '../../core/services/inventario.service';
import { AlertaStock } from '../../core/models/erp.models';

/**
 * Componente Monitor de Alertas de Stock Crítico (HU05).
 * Detecta insumos que cruzaron el umbral mínimo de seguridad y permite
 * gestionar y atender alertas generadas automáticamente por la API.
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
    const numAlertasApi = this.alertas().length;
    const numCriticos = this.erpService.insumosCriticos().length;
    return Math.max(numAlertasApi, numCriticos);
  });

  ngOnInit(): void {
    this.recargarAlertas();
  }

  recargarAlertas(): void {
    this.cargando.set(true);

    // Actualizar insumos y alertas simultáneamente desde la API
    this.erpService.cargarInsumos().subscribe({
      next: () => {},
      error: (err) => console.error('Error al actualizar insumos:', err)
    });

    this.inventarioApi.listarAlertas('ABIERTA').subscribe({
      next: (lista) => {
        this.alertas.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al consultar alertas:', err);
        this.cargando.set(false);
      }
    });
  }

  atenderAlerta(idAlerta: number): void {
    this.atendiendoId.set(idAlerta);

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
