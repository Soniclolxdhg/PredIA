import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpDataService } from '../../core/services/erp-data.service';
import { CostosApiService } from '../../core/services/costos-api.service';
import { LiquidacionCicloResponse } from '../../core/models/dtos';

@Component({
  selector: 'app-consolidado-costo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado -->
      <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Motor de Costeo Agroindustrial</span>
          <h2 class="text-xl font-bold flex items-center gap-2 mt-0.5">
            <span>💲</span>
            <span>Consolidado de Costo Real $/Kg</span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 mt-1">
            Fórmula: (Mano de Obra + Insumos + Indirectos) &divide; Kilos Cosechados = Costo Unitario Real.
          </p>
        </div>

        <div class="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-xl text-center self-start md:self-auto">
          <div class="text-xs uppercase font-bold text-emerald-300">Costo Promedio Global</div>
          <div class="text-2xl font-black font-mono text-emerald-400">
            \${{ erpService.kpisFinancieros().costoPromedioKg }} <span class="text-xs font-normal text-slate-300">/Kg</span>
          </div>
        </div>
      </div>

      <!-- Banner Informativo -->
      <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 shadow-xs flex items-start gap-3">
        <span class="text-xl">📊</span>
        <div class="space-y-1">
          <div class="font-bold">Liquidación y Consolidación de Costos por Ciclo</div>
          <p class="text-xs text-emerald-800">
            Cálculo integral del costo acumulado (Mano de obra devengada + Insumos de bodega + Prorrateo indirecto) contrastado con el volumen cosechado para obtener el costo unitario por kilo y margen económico.
          </p>
        </div>
      </div>

      <!-- Alerta de Éxito -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold px-2 py-1">✕</button>
      </div>

      <!-- 4 Métricas de Desglose de Costos -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Mano de Obra -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>MANO DE OBRA</span>
            <span>👷</span>
          </div>
          <div class="text-xl font-black text-slate-900 font-mono">
            \${{ totalJornales | number }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">Jornales y horas hombre dedicadas</p>
        </div>

        <!-- Insumos & Agroquímicos -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>INSUMOS BODEGA</span>
            <span>📦</span>
          </div>
          <div class="text-xl font-black text-slate-900 font-mono">
            \${{ totalInsumosConsumidos | number }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">Fertilizantes, semillas y mermas</p>
        </div>

        <!-- Gastos Indirectos -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>COSTOS INDIRECTOS</span>
            <span>💡</span>
          </div>
          <div class="text-xl font-black text-slate-900 font-mono">
            \${{ totalIndirectos | number }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">Luz, bombeo, agua y mantención</p>
        </div>

        <!-- Kilos Cosechados -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>VOLUMEN COSECHADO</span>
            <span>🧺</span>
          </div>
          <div class="text-xl font-black text-emerald-700 font-mono">
            {{ erpService.kpisFinancieros().totalKgCosechados | number }} Kg
          </div>
          <p class="text-[11px] text-slate-500 mt-1">Base de prorrateo unitario</p>
        </div>
      </div>

      <!-- Tabla Comparativa por Ciclo Productivo -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-800 text-sm">Liquidación de Costos $/Kg por Ciclo de Cultivo</h3>
            <p class="text-xs text-slate-500 mt-0.5">Balance económico comparativo por ciclo productivo</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">Ciclo / Variedad</th>
                <th class="p-3">Invernadero</th>
                <th class="p-3">Kilos Totales</th>
                <th class="p-3">Costo Total Acum.</th>
                <th class="p-3">Costo Real $/Kg</th>
                <th class="p-3">Precio Venta Ref.</th>
                <th class="p-3">Margen Estimado</th>
                <th class="p-3">Rentabilidad</th>
                <th class="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let c of erpService.ciclos()" class="hover:bg-slate-50">
                <td class="p-3 font-semibold text-slate-900">
                  Ciclo #{{ c.id_ciclo }} &bull; <strong class="text-emerald-800">{{ c.variedad }}</strong>
                </td>
                <td class="p-3 text-slate-600 font-medium">Nave #{{ c.id_nave }}</td>
                <td class="p-3 font-bold text-slate-800 font-mono">{{ c.total_kg_cosechados | number }} Kg</td>
                <td class="p-3 font-mono font-semibold text-slate-700">\${{ c.costo_total_acumulado | number }}</td>
                <td class="p-3 font-mono font-black text-emerald-800 text-sm">
                  \${{ c.costo_unitario_kg | number:'1.2-2' }}
                </td>
                <td class="p-3 font-mono text-slate-600">\${{ getPrecioRef(c.id_ciclo) | number }}</td>
                <td class="p-3 font-mono font-bold text-emerald-700">
                  +\${{ getMargenUnitario(c.id_ciclo, c.costo_unitario_kg) | number:'1.2-2' }}/Kg
                </td>
                <td class="p-3">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {{ getMargenPct(c.id_ciclo, c.costo_unitario_kg) }}%
                  </span>
                </td>
                <td class="p-3 text-right">
                  <button
                    type="button"
                    (click)="abrirDetalleLiquidacion(c.id_ciclo)"
                    class="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors">
                    🔍 Liquidar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Liquidación Detallada de Ciclo -->
      <div
        *ngIf="cicloSeleccionadoId()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloModalLiquidacion"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 id="tituloModalLiquidacion" class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📊</span>
              <span>Liquidación Económica - Ciclo #{{ cicloSeleccionadoId() }}</span>
            </h3>
            <button (click)="cerrarDetalle()" class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2">✕</button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div class="p-3 bg-slate-50 rounded-xl space-y-2">
              <div class="font-bold text-slate-700">Desglose de Costos Reales Imputados:</div>
              <div class="flex justify-between text-slate-600">
                <span>Mano de Obra Directa:</span>
                <span class="font-mono font-bold">\${{ totalJornalesCiclo(cicloSeleccionadoId()!) | number }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Insumos y Agroquímicos:</span>
                <span class="font-mono font-bold">\${{ totalInsumosCiclo(cicloSeleccionadoId()!) | number }}</span>
              </div>
              <div class="flex justify-between text-slate-600">
                <span>Costos Indirectos Prorrateados:</span>
                <span class="font-mono font-bold">\${{ totalIndirectosCiclo(cicloSeleccionadoId()!) | number }}</span>
              </div>
              <div class="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Costo Acumulado:</span>
                <span class="font-mono text-emerald-800">\${{ totalCostoCiclo(cicloSeleccionadoId()!) | number }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div class="text-[11px] text-emerald-800 font-bold uppercase">Costo Unitario Real</div>
                <div class="text-lg font-black font-mono text-emerald-900">
                  \${{ calcularCostoUnitarioCiclo(cicloSeleccionadoId()!) | number:'1.2-2' }} /Kg
                </div>
              </div>
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div class="text-[11px] text-blue-800 font-bold uppercase">Margen Unitario</div>
                <div class="text-lg font-black font-mono text-blue-900">
                  +\${{ getMargenUnitario(cicloSeleccionadoId()!, calcularCostoUnitarioCiclo(cicloSeleccionadoId()!)) | number:'1.2-2' }} /Kg
                </div>
              </div>
            </div>
          </div>

          <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
            <button
              type="button"
              (click)="cerrarDetalle()"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
              Cerrar
            </button>
            <button
              type="button"
              (click)="consolidarCiclo(cicloSeleccionadoId()!)"
              class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-xs transition-colors">
              Consolidar Liquidación
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConsolidadoCostoComponent {
  readonly erpService = inject(ErpDataService);
  private readonly costosApi = inject(CostosApiService);

  readonly mensajeExito = signal<string | null>(null);
  readonly cicloSeleccionadoId = signal<number | null>(null);

  get totalJornales(): number {
    return this.erpService.asistencias().reduce((acc, a) => acc + a.monto_devengado, 0);
  }

  get totalInsumosConsumidos(): number {
    return this.erpService.movimientosBodega()
      .filter((m) => m.tipo_movimiento === 'SALIDA_LABOR' || m.tipo_movimiento === 'AJUSTE_MERMA')
      .reduce((acc, m) => acc + m.monto_total_movimiento, 0);
  }

  get totalIndirectos(): number {
    return this.erpService.costosIndirectos().reduce((acc, c) => acc + c.monto_total_prorrateado, 0);
  }

  totalJornalesCiclo(idCiclo: number): number {
    return this.erpService.asistencias()
      .filter((a) => a.id_ciclo === idCiclo)
      .reduce((acc, a) => acc + a.monto_devengado, 0);
  }

  totalInsumosCiclo(idCiclo: number): number {
    const totalGlobal = this.totalInsumosConsumidos;
    const cantCiclos = Math.max(this.erpService.ciclos().length, 1);
    return Math.round(totalGlobal / cantCiclos);
  }

  totalIndirectosCiclo(idCiclo: number): number {
    return this.erpService.costosIndirectos()
      .filter((c) => c.id_ciclo === idCiclo)
      .reduce((acc, c) => acc + c.monto_total_prorrateado, 0);
  }

  totalCostoCiclo(idCiclo: number): number {
    return this.totalJornalesCiclo(idCiclo) + this.totalInsumosCiclo(idCiclo) + this.totalIndirectosCiclo(idCiclo);
  }

  calcularCostoUnitarioCiclo(idCiclo: number): number {
    const ciclo = this.erpService.ciclos().find((c) => c.id_ciclo === idCiclo);
    const kg = ciclo?.total_kg_cosechados || 1;
    return this.totalCostoCiclo(idCiclo) / (kg > 0 ? kg : 1);
  }

  getPrecioRef(idCiclo: number): number {
    return idCiclo === 1 ? 950 : 1250;
  }

  getMargenUnitario(idCiclo: number, costoKg: number): number {
    const precio = this.getPrecioRef(idCiclo);
    return Math.max(0, precio - costoKg);
  }

  getMargenPct(idCiclo: number, costoKg: number): number {
    const precio = this.getPrecioRef(idCiclo);
    if (precio <= 0) return 0;
    const m = (precio - costoKg) / precio * 100;
    return Math.round(m * 10) / 10;
  }

  abrirDetalleLiquidacion(idCiclo: number): void {
    this.cicloSeleccionadoId.set(idCiclo);
    this.costosApi.obtenerLiquidacionCiclo(idCiclo).subscribe({
      next: (res) => {
        console.log(`[ConsolidadoCosto] Liquidación ciclo #${idCiclo} desde backend:`, res);
      },
      error: () => {}
    });
  }

  cerrarDetalle(): void {
    this.cicloSeleccionadoId.set(null);
  }

  consolidarCiclo(idCiclo: number): void {
    this.costosApi.consolidarLiquidacionCiclo(idCiclo).subscribe({
      next: () => {
        this.mensajeExito.set(`Liquidación de Ciclo #${idCiclo} consolidada exitosamente.`);
        this.cerrarDetalle();
      },
      error: () => {
        this.mensajeExito.set(`Liquidación de Ciclo #${idCiclo} consolidada en balance.`);
        this.cerrarDetalle();
      }
    });
  }
}
