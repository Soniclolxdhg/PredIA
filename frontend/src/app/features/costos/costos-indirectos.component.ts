import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';

@Component({
  selector: 'app-costos-indirectos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botón -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">💡</span>
            <h2 class="text-xl font-bold text-slate-800">Imputación de Costos Indirectos (HU07)</h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gastos generales de energía/bombeo, agua y mantención con criterio de prorrateo por m² o equitativo.
          </p>
        </div>

        <button
          type="button"
          (click)="abrirModal()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
          <span>➕</span>
          <span>Registrar Gasto Indirecto</span>
        </button>
      </div>

      <!-- Alerta de Éxito -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold">✕</button>
      </div>

      <!-- Tabla de Costos Indirectos Imputados -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Historial de Costos Indirectos Prorrateados</h3>
          <span class="text-xs text-slate-500 font-mono font-bold">
            Total Indirectos: \${{ totalIndirectos | number }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">ID / Fecha</th>
                <th class="p-3">Tipo de Gasto</th>
                <th class="p-3">Comprobante / Factura</th>
                <th class="p-3">Ciclo Imputado</th>
                <th class="p-3">Criterio Prorrateo</th>
                <th class="p-3">Monto Prorrateado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let c of erpService.costosIndirectos()" class="hover:bg-slate-50">
                <td class="p-3 font-mono text-slate-600 text-xs">
                  #{{ c.id_costo_indirecto }} &bull; {{ c.fecha_imputacion }}
                </td>
                <td class="p-3 font-semibold text-slate-900">
                  <span class="p-1 rounded bg-slate-100 border text-xs mr-1">
                    {{ getIconoGasto(c.tipo_gasto) }}
                  </span>
                  {{ c.tipo_gasto }}
                </td>
                <td class="p-3 font-mono text-slate-700 font-semibold">{{ c.comprobante_factura }}</td>
                <td class="p-3 font-medium text-emerald-800">Ciclo #{{ c.id_ciclo }}</td>
                <td class="p-3 text-slate-600 text-xs">
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 border text-[11px] font-bold">
                    {{ c.criterio_distribucion }}
                  </span>
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">
                  \${{ c.monto_total_prorrateado | number }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Registro de Costo Indirecto -->
      <div
        *ngIf="modalVisible()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>💡</span>
              <span>Imputar Costo Indirecto al Ciclo</span>
            </h3>
            <button (click)="cerrarModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="costoForm" (ngSubmit)="onSubmitCosto()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de Gasto *</label>
                <select formControlName="tipo_gasto" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="ELECTRICIDAD_BOMBEO">Electricidad / Bombeo</option>
                  <option value="AGUA_RIEGO">Agua de Riego / Canal</option>
                  <option value="MANTENCION_NAVE">Mantención de Invernadero</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Ciclo Receptor *</label>
                <select formControlName="id_ciclo" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="" disabled>Seleccione ciclo...</option>
                  <option *ngFor="let c of erpService.ciclosActivos()" [value]="c.id_ciclo">
                    Ciclo #{{ c.id_ciclo }}: {{ c.variedad }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Monto Total ($) *</label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  formControlName="monto_total_prorrateado"
                  placeholder="ej. 450000"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Fecha Imputación *</label>
                <input
                  type="date"
                  formControlName="fecha_imputacion"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Comprobante / Factura *</label>
                <input
                  type="text"
                  formControlName="comprobante_factura"
                  placeholder="ej. FAC-ENEL-9988"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Criterio Distribución *</label>
                <select formControlName="criterio_distribucion" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="SUPERFICIE_M2">Prorrateo por m²</option>
                  <option value="EQUITATIVO_CICLOS">Equitativo por Ciclo</option>
                </select>
              </div>
            </div>

            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="costoForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Imputar Costo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CostosIndirectosComponent {
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  readonly modalVisible = signal(false);
  readonly mensajeExito = signal<string | null>(null);

  readonly costoForm: FormGroup = this.fb.group({
    tipo_gasto: ['ELECTRICIDAD_BOMBEO', [Validators.required]],
    id_ciclo: ['', [Validators.required]],
    monto_total_prorrateado: [250000, [Validators.required, Validators.min(1000)]],
    fecha_imputacion: [new Date().toISOString().split('T')[0], [Validators.required]],
    comprobante_factura: ['', [Validators.required]],
    criterio_distribucion: ['SUPERFICIE_M2', [Validators.required]]
  });

  get totalIndirectos(): number {
    return this.erpService.costosIndirectos().reduce((acc, c) => acc + c.monto_total_prorrateado, 0);
  }

  getIconoGasto(tipo: string): string {
    switch (tipo) {
      case 'ELECTRICIDAD_BOMBEO': return '⚡';
      case 'AGUA_RIEGO': return '💧';
      case 'MANTENCION_NAVE': return '🛠️';
      default: return '📄';
    }
  }

  abrirModal(): void {
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  onSubmitCosto(): void {
    if (this.costoForm.invalid) return;

    const val = this.costoForm.value;

    this.erpService.registrarCostoIndirecto({
      tipo_gasto: val.tipo_gasto,
      id_ciclo: Number(val.id_ciclo),
      monto_total_prorrateado: Number(val.monto_total_prorrateado),
      fecha_imputacion: val.fecha_imputacion,
      comprobante_factura: val.comprobante_factura,
      criterio_distribucion: val.criterio_distribucion
    });

    this.mensajeExito.set(`Costo de ${val.tipo_gasto} imputado correctamente al ciclo.`);
    this.cerrarModal();
  }
}
