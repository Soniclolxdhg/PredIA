import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { Nave } from '../../core/models/erp.models';

@Component({
  selector: 'app-ciclos-cultivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botón de Apertura -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏡</span>
            <h2 class="text-xl font-bold text-slate-800">Ciclos de Cultivo & Naves (HU01)</h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Control de ocupación de invernaderos y aperturas de ciclo productivo.
          </p>
        </div>

        <button
          type="button"
          (click)="abrirModal()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
          <span>➕</span>
          <span>Aperturar Nuevo Ciclo</span>
        </button>
      </div>

      <!-- Alertas de Negocio -->
      <div *ngIf="mensajeError()" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">⚠️ {{ mensajeError() }}</span>
        <button (click)="mensajeError.set(null)" class="text-rose-500 font-bold hover:text-rose-800">✕</button>
      </div>

      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-600 font-bold hover:text-emerald-900">✕</button>
      </div>

      <!-- Resumen de Naves e Invernaderos (Tarjetas) -->
      <div>
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
          Estado de Naves e Invernaderos (Superficie Total: {{ totalSuperficie }} m²)
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            *ngFor="let nave of erpService.naves()"
            class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {{ nave.codigo_nave }}
              </span>
              <span [class]="getClaseEstadoNave(nave.estado)" class="text-[11px] font-bold px-2 py-0.5 rounded-full border">
                {{ nave.estado }}
              </span>
            </div>
            <h4 class="font-bold text-slate-900 text-sm mb-1">{{ nave.nombre }}</h4>
            <div class="text-xs text-slate-500 space-y-1">
              <div>Superficie: <strong class="text-slate-700">{{ nave.superficie_m2 | number }} m²</strong></div>
              <div>Estructura: <span class="text-slate-600">{{ nave.tipo_estructura }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla de Ciclos de Cultivo -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Historial y Ciclos Activos de la Temporada</h3>
          <span class="text-xs text-slate-500">{{ erpService.ciclos().length }} ciclos registrados</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">ID / Temporada</th>
                <th class="p-3">Nave Asignada</th>
                <th class="p-3">Variedad Agrícola</th>
                <th class="p-3">Fechas (Inicio - Cierre)</th>
                <th class="p-3">Kg Cosechados</th>
                <th class="p-3">Costo Total</th>
                <th class="p-3">Costo $/Kg</th>
                <th class="p-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let ciclo of erpService.ciclos()" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 font-semibold text-slate-800">
                  #{{ ciclo.id_ciclo }} &bull; <span class="text-xs text-slate-500">{{ ciclo.temporada }}</span>
                </td>
                <td class="p-3">
                  <span class="font-medium text-slate-700">{{ getNaveNombre(ciclo.id_nave) }}</span>
                </td>
                <td class="p-3 font-bold text-emerald-800">
                  {{ ciclo.variedad }}
                </td>
                <td class="p-3 text-slate-600 text-xs">
                  {{ ciclo.fecha_inicio }} &rarr; {{ ciclo.fecha_termino_estimada }}
                </td>
                <td class="p-3 font-semibold text-slate-800">
                  {{ ciclo.total_kg_cosechados | number }} Kg
                </td>
                <td class="p-3 font-mono text-slate-700">
                  \${{ ciclo.costo_total_acumulado | number }}
                </td>
                <td class="p-3 font-mono font-bold text-emerald-700">
                  \${{ ciclo.costo_unitario_kg | number:'1.2-2' }}
                </td>
                <td class="p-3">
                  <span
                    [class]="ciclo.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'"
                    class="px-2 py-0.5 rounded-full text-xs font-bold border">
                    {{ ciclo.estado }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Apertura de Ciclo con Regla de Negocio -->
      <div
        *ngIf="modalVisible()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🌱</span>
              <span>Aperturar Nuevo Ciclo de Cultivo</span>
            </h3>
            <button (click)="cerrarModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="cicloForm" (ngSubmit)="onSubmitCiclo()" class="space-y-4">
            <!-- Nave Asignada con indicador de disponibilidad -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Invernadero / Nave Destino *</label>
              <select formControlName="id_nave" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione una nave...</option>
                <option *ngFor="let n of erpService.naves()" [value]="n.id_nave">
                  {{ n.codigo_nave }} - {{ n.nombre }} ({{ n.estado }})
                </option>
              </select>
              <p class="text-[11px] text-slate-500 mt-1">
                * Regla: No se permite aperturar si la nave ya tiene un ciclo ACTIVO.
              </p>
            </div>

            <!-- Temporada y Variedad -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Temporada *</label>
                <select formControlName="temporada" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="PRIMAVERA_2026">Primavera 2026</option>
                  <option value="OTONO_2026">Otoño 2026</option>
                  <option value="VERANO_2027">Verano 2027</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Variedad Agrícola *</label>
                <input
                  type="text"
                  formControlName="variedad"
                  placeholder="ej. Tomate Larga Vida"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <!-- Fechas -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Fecha de Inicio *</label>
                <input
                  type="date"
                  formControlName="fecha_inicio"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Fecha Término Estimada *</label>
                <input
                  type="date"
                  formControlName="fecha_termino_estimada"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <!-- Botones de Acción -->
            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModal()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="cicloForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Guardar y Aperturar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CiclosCultivoComponent {
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  readonly modalVisible = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  readonly cicloForm: FormGroup = this.fb.group({
    id_nave: ['', [Validators.required]],
    temporada: ['PRIMAVERA_2026', [Validators.required]],
    variedad: ['', [Validators.required, Validators.minLength(3)]],
    fecha_inicio: [new Date().toISOString().split('T')[0], [Validators.required]],
    fecha_termino_estimada: ['', [Validators.required]]
  });

  get totalSuperficie(): number {
    return this.erpService.naves().reduce((acc, n) => acc + n.superficie_m2, 0);
  }

  getNaveNombre(idNave: number): string {
    const nave = this.erpService.naves().find((n) => n.id_nave === idNave);
    return nave ? `${nave.nombre} (${nave.codigo_nave})` : `Nave #${idNave}`;
  }

  getClaseEstadoNave(estado: string): string {
    switch (estado) {
      case 'EN_CULTIVO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPONIBLE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANTENCION': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  abrirModal(): void {
    this.cicloForm.reset({
      id_nave: '',
      temporada: 'PRIMAVERA_2026',
      variedad: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_termino_estimada: ''
    });
    this.mensajeError.set(null);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  onSubmitCiclo(): void {
    if (this.cicloForm.invalid) return;

    const res = this.erpService.crearCicloCultivo(this.cicloForm.value);
    if (!res.exito) {
      this.mensajeError.set(res.mensaje);
    } else {
      this.mensajeExito.set(res.mensaje);
      this.cerrarModal();
    }
  }
}
