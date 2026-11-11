import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ErpDataService } from '../../core/services/erp-data.service';

@Component({
  selector: 'app-alertas-stock',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Estado de Alerta -->
      <div
        [class]="erpService.insumosCriticos().length > 0 ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white' : 'bg-emerald-700 text-white'"
        class="p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-3xl">{{ erpService.insumosCriticos().length > 0 ? '🚨' : '🛡️' }}</span>
            <h2 class="text-xl font-extrabold">Monitor de Alertas de Stock Crítico (HU05)</h2>
          </div>
          <p class="text-xs sm:text-sm text-white/90 mt-1">
            Detección automática de insumos bajo punto de reorden (Stock Actual &le; Stock Mínimo de Alerta).
          </p>
        </div>

        <div class="bg-white/20 backdrop-blur-xs px-4 py-2 rounded-xl text-center self-start sm:self-auto">
          <div class="text-2xl font-black">{{ erpService.insumosCriticos().length }}</div>
          <div class="text-[10px] uppercase font-bold tracking-wider">Insumos Críticos</div>
        </div>
      </div>

      <!-- Banner de Advertencia Si Hay Stock Crítico -->
      <div *ngIf="erpService.insumosCriticos().length > 0; else sinAlertas" class="space-y-4">
        <div class="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-xl text-amber-900 text-xs sm:text-sm flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <div>
            <span class="font-bold">Acción Requerida para Bodeguero y Gerencia:</span>
            <p class="mt-0.5 text-amber-800">
              Existen <strong>{{ erpService.insumosCriticos().length }}</strong> insumos que han cruzado el umbral de seguridad. Se recomienda gestionar de inmediato órdenes de compra para no detener las labores de campo programadas.
            </p>
          </div>
        </div>

        <!-- Tarjetas de Insumos Críticos Detallados -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            *ngFor="let item of erpService.insumosCriticos()"
            class="bg-white rounded-2xl border-2 border-rose-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">
                  {{ item.codigo_insumo }}
                </span>
                <span class="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                  Déficit: {{ item.stock_minimo_alerta - item.stock_actual | number }} {{ item.unidad_medida }}
                </span>
              </div>

              <h3 class="font-bold text-slate-900 text-base">{{ item.nombre }}</h3>
              <div class="text-xs text-slate-500 mt-0.5">Categoría: <strong>{{ item.categoria }}</strong></div>

              <!-- Barra de Progreso de Stock -->
              <div class="mt-4 space-y-1">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-rose-600">Stock Actual: {{ item.stock_actual }} {{ item.unidad_medida }}</span>
                  <span class="text-slate-500">Mínimo: {{ item.stock_minimo_alerta }} {{ item.unidad_medida }}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    class="bg-rose-500 h-2.5 rounded-full"
                    [style.width.%]="calcularPorcentajeStock(item.stock_actual, item.stock_minimo_alerta)">
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs text-slate-500 font-mono">
                Costo Ref: \${{ item.costo_unitario_promedio | number }}
              </span>
              <a
                routerLink="/bodega/kardex"
                class="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1">
                <span>Registrar Entrada</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <ng-template #sinAlertas>
        <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <div class="text-4xl">✅</div>
          <h3 class="text-base font-bold text-slate-800">Todos los Insumos Están en Niveles Óptimos</h3>
          <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            No se detectan faltantes en almacén. El inventario supera todos los márgenes de seguridad establecidos para la temporada.
          </p>
        </div>
      </ng-template>
    </div>
  `
})
export class AlertasStockComponent {
  readonly erpService = inject(ErpDataService);

  calcularPorcentajeStock(actual: number, minimo: number): number {
    if (minimo <= 0) return 100;
    const pct = (actual / minimo) * 100;
    return Math.min(Math.max(pct, 5), 100);
  }
}

