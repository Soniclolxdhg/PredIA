import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { TipoMovimiento } from '../../core/models/enum.types';

@Component({
  selector: 'app-kardex-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botón de Movimiento -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">📋</span>
            <h2 class="text-xl font-bold text-slate-800">Kardex de Inventario & Mermas (HU04)</h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de insumos con control de saldo físico, PMP y ajuste de merma biológica en semillas/almácigos.
          </p>
        </div>

        <button
          type="button"
          (click)="abrirModal()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
          <span>📦</span>
          <span>Registrar Movimiento en Kardex</span>
        </button>
      </div>

      <!-- Alerta de Éxito -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold">✕</button>
      </div>

      <!-- Catálogo de Insumos y Saldo Físico PMP -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Catálogo de Insumos & Saldo Físico</h3>
          <span class="text-xs text-slate-500">{{ erpService.insumos().length }} insumos activos</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">Código</th>
                <th class="p-3">Nombre del Insumo</th>
                <th class="p-3">Categoría</th>
                <th class="p-3">Unidad</th>
                <th class="p-3">Stock Actual</th>
                <th class="p-3">Stock Mínimo</th>
                <th class="p-3">Costo Unit. PMP</th>
                <th class="p-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let ins of erpService.insumos()" class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-slate-700">{{ ins.codigo_insumo }}</td>
                <td class="p-3 font-semibold text-slate-900">
                  {{ ins.nombre }}
                  <span *ngIf="ins.es_material_vegetal" class="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono ml-1">
                    Vegetal
                  </span>
                </td>
                <td class="p-3 text-slate-600">{{ ins.categoria }}</td>
                <td class="p-3 text-slate-500 font-mono">{{ ins.unidad_medida }}</td>
                <td class="p-3 font-mono font-bold" [class.text-rose-600]="ins.stock_actual <= ins.stock_minimo_alerta">
                  {{ ins.stock_actual | number }}
                </td>
                <td class="p-3 font-mono text-slate-500">{{ ins.stock_minimo_alerta | number }}</td>
                <td class="p-3 font-mono text-slate-700">\${{ ins.costo_unitario_promedio | number }}</td>
                <td class="p-3">
                  <span
                    *ngIf="ins.stock_actual <= ins.stock_minimo_alerta; else stockOk"
                    class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    CRÍTICO
                  </span>
                  <ng-template #stockOk>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      NORMAL
                    </span>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historial de Movimientos Kardex con Merma -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Historial de Movimientos de Bodega (Kardex)</h3>
          <span class="text-xs text-slate-500">{{ erpService.movimientosBodega().length }} movimientos</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">Fecha</th>
                <th class="p-3">Insumo</th>
                <th class="p-3">Tipo Movimiento</th>
                <th class="p-3">Cant. Nominal</th>
                <th class="p-3">% Merma</th>
                <th class="p-3">Cant. Neta</th>
                <th class="p-3">Costo Unit.</th>
                <th class="p-3">Total</th>
                <th class="p-3">Doc. Referencia</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let m of erpService.movimientosBodega()" class="hover:bg-slate-50">
                <td class="p-3 text-slate-600 font-mono text-xs">{{ m.fecha_movimiento }}</td>
                <td class="p-3 font-semibold text-slate-800">{{ getNombreInsumo(m.id_insumo) }}</td>
                <td class="p-3">
                  <span [class]="getClaseTipoMov(m.tipo_movimiento)" class="px-2 py-0.5 rounded-full text-[11px] font-bold border">
                    {{ m.tipo_movimiento }}
                  </span>
                </td>
                <td class="p-3 font-mono">{{ m.cantidad_nominal | number }}</td>
                <td class="p-3 font-mono font-bold" [class.text-rose-600]="m.porcentaje_merma > 0">
                  {{ m.porcentaje_merma }}%
                </td>
                <td class="p-3 font-mono font-bold text-emerald-800">{{ m.cantidad_neta | number }}</td>
                <td class="p-3 font-mono text-slate-600">\${{ m.costo_unitario_compra | number }}</td>
                <td class="p-3 font-mono font-bold text-slate-900">\${{ m.monto_total_movimiento | number }}</td>
                <td class="p-3 text-slate-500 text-xs">{{ m.documento_referencia || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Registro de Movimiento Kardex -->
      <div
        *ngIf="modalVisible()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📦</span>
              <span>Registrar Movimiento en Kardex</span>
            </h3>
            <button (click)="cerrarModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="movForm" (ngSubmit)="onSubmitMovimiento()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Insumo Receptor / Saliente *</label>
              <select formControlName="id_insumo" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione un insumo...</option>
                <option *ngFor="let ins of erpService.insumos()" [value]="ins.id_insumo">
                  {{ ins.codigo_insumo }} - {{ ins.nombre }} (Stock: {{ ins.stock_actual }} {{ ins.unidad_medida }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de Movimiento *</label>
                <select formControlName="tipo_movimiento" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="ENTRADA_COMPRA">Entrada por Compra</option>
                  <option value="SALIDA_LABOR">Salida a Labor de Campo</option>
                  <option value="AJUSTE_MERMA">Ajuste por Merma Biológica</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Movimiento *</label>
                <input
                  type="date"
                  formControlName="fecha_movimiento"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Cant. Nominal *</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  formControlName="cantidad_nominal"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">% Merma Estimada</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  formControlName="porcentaje_merma"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold text-rose-600 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Costo Unitario ($)</label>
                <input
                  type="number"
                  min="0"
                  formControlName="costo_unitario_compra"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <!-- Previsualización de Cantidad Neta calculada -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
              <span class="text-slate-600">Fórmula de Merma Aplicada:</span>
              <span class="font-bold text-emerald-800 font-mono">
                Cant. Neta: {{ calcularCantidadNetaPrevia() | number }}
              </span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Documento / Guía de Despacho</label>
              <input
                type="text"
                formControlName="documento_referencia"
                placeholder="ej. FAC-5544 o Guía 99"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
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
                [disabled]="movForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Registrar Movimiento
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class KardexInventarioComponent {
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly modalVisible = signal(false);
  readonly mensajeExito = signal<string | null>(null);

  readonly movForm: FormGroup = this.fb.group({
    id_insumo: ['', [Validators.required]],
    tipo_movimiento: ['ENTRADA_COMPRA', [Validators.required]],
    fecha_movimiento: [new Date().toISOString().split('T')[0], [Validators.required]],
    cantidad_nominal: [100, [Validators.required, Validators.min(0.1)]],
    porcentaje_merma: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    costo_unitario_compra: [1500, [Validators.required, Validators.min(0)]],
    documento_referencia: ['']
  });

  getNombreInsumo(idInsumo: number): string {
    const ins = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
    return ins ? ins.nombre : `Insumo #${idInsumo}`;
  }

  getClaseTipoMov(tipo: TipoMovimiento): string {
    switch (tipo) {
      case 'ENTRADA_COMPRA': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SALIDA_LABOR': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'AJUSTE_MERMA': return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  }

  calcularCantidadNetaPrevia(): number {
    const nom = Number(this.movForm.get('cantidad_nominal')?.value || 0);
    const merma = Number(this.movForm.get('porcentaje_merma')?.value || 0);
    return Math.round(nom * (1 - merma / 100) * 100) / 100;
  }

  abrirModal(): void {
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  onSubmitMovimiento(): void {
    if (this.movForm.invalid) return;

    const val = this.movForm.value;
    const currentUser = this.authService.currentUser();

    this.erpService.registrarMovimientoKardex({
      id_insumo: Number(val.id_insumo),
      tipo_movimiento: val.tipo_movimiento,
      fecha_movimiento: val.fecha_movimiento,
      cantidad_nominal: Number(val.cantidad_nominal),
      porcentaje_merma: Number(val.porcentaje_merma),
      costo_unitario_compra: Number(val.costo_unitario_compra),
      id_usuario: currentUser?.id_usuario || 3,
      documento_referencia: val.documento_referencia
    });

    this.mensajeExito.set('Movimiento de Kardex registrado y stock físico actualizado.');
    this.cerrarModal();
  }
}
