import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpDataService } from '../../core/services/erp-data.service';

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
            <span>Consolidado de Costo Real $/Kg (HU09)</span>
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

      <!-- Banner de Estado Prototipo -->
      <div class="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs sm:text-sm text-amber-900 shadow-xs flex items-start gap-3">
        <span class="text-xl">⚠️</span>
        <div class="space-y-1">
          <div class="font-bold">Módulo Demostrativo / Motor de Costeo Estimativo</div>
          <p class="text-xs text-amber-800">
            El consolidado computa en memoria las imputaciones devengadas de los ciclos productivos. Los reportes contables consolidados definitivos se activarán al desplegar los endpoints de balance en el backend NestJS.
          </p>
        </div>
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
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Liquidación de Costos $/Kg por Ciclo de Cultivo</h3>
          <span class="text-xs text-slate-500 font-medium">Temporada Primavera 2026</span>
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ConsolidadoCostoComponent {
  readonly erpService = inject(ErpDataService);

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
}

