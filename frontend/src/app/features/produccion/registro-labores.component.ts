import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { TipoLabor } from '../../core/models/enum.types';

/**
 * Componente para el Registro de Labores Agrícolas en Terreno (HU02).
 * Permite registrar faenas en los invernaderos (riego, fertilización, fitosanitarios, siembra y cosecha),
 * asociar el responsable, imputar costos por horas dedicadas y descontar insumos de bodega de forma automática.
 */
@Component({
  selector: 'app-registro-labores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-4xl mx-auto">
      <!-- Encabezado del registro de labores -->
      <div class="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-300">Operaciones en Invernadero</span>
          <h2 class="text-xl font-bold flex items-center gap-2">
            <span>🚜</span>
            <span>Registro de Labores Agrícolas (HU02)</span>
          </h2>
          <p class="text-xs text-emerald-100 mt-0.5">Captura de faenas agronómicas con imputación a ciclo y descuento opcional de bodega.</p>
        </div>
        <div class="bg-white/10 px-3 py-1.5 rounded-xl text-xs backdrop-blur-xs self-start sm:self-auto">
          Responsable: <strong>{{ authService.currentUser()?.nombre_completo }}</strong>
        </div>
      </div>

      <!-- Alerta de confirmación de registro exitoso -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold">✕</button>
      </div>

      <!-- Formulario para ingreso de la labor -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <form [formGroup]="laborForm" (ngSubmit)="onSubmitLabor()" class="space-y-5">
          <!-- Selección del ciclo de cultivo receptor -->
          <div>
            <label class="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
              Ciclo de Cultivo Activo Receptor *
            </label>
            <select
              formControlName="id_ciclo"
              class="w-full p-3 text-sm rounded-xl border-2 border-slate-300 bg-white font-medium focus:border-emerald-600 focus:outline-none touch-target">
              <option value="" disabled>Seleccione el ciclo activo...</option>
              <option *ngFor="let c of erpService.ciclosActivos()" [value]="c.id_ciclo">
                Ciclo #{{ c.id_ciclo }}: {{ c.variedad }} • Nave #{{ c.id_nave }} ({{ c.temporada }})
              </option>
            </select>
          </div>

          <!-- Tipo de labor agronómica -->
          <div>
            <label class="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
              Tipo de Labor Agrícola *
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                *ngFor="let tipo of tiposLabor"
                (click)="seleccionarTipoLabor(tipo)"
                [class]="laborForm.get('tipo_labor')?.value === tipo ? 'bg-emerald-700 text-white font-bold border-emerald-800 shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 font-medium'"
                class="p-3 text-xs sm:text-sm rounded-xl border flex flex-col items-center justify-center gap-1 touch-target transition-all">
                <span class="text-lg">{{ getIconoLabor(tipo) }}</span>
                <span>{{ tipo }}</span>
              </button>
            </div>
          </div>

          <!-- Fecha de ejecución y duración de la faena -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                Fecha de Ejecución *
              </label>
              <input
                type="date"
                formControlName="fecha_ejecucion"
                class="w-full p-3 text-sm rounded-xl border-2 border-slate-300 font-medium focus:border-emerald-600 focus:outline-none touch-target"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                Horas Dedicadas (Personal en Terreno) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                formControlName="horas_dedicadas"
                placeholder="ej. 8"
                class="w-full p-3 text-sm rounded-xl border-2 border-slate-300 font-mono font-bold focus:border-emerald-600 focus:outline-none touch-target"
              />
              <span class="text-[11px] text-slate-500 mt-1 block">Imputa costo hora hombre al ciclo productivo.</span>
            </div>
          </div>

          <!-- Descuento de materiales e insumos de bodega -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                <span>📦</span>
                <span>Descuento Opcional de Insumos (Bodega)</span>
              </span>
              <span class="text-[11px] text-slate-500">Kardex automático</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-slate-600 mb-1">Insumo Utilizado</label>
                <select
                  formControlName="id_insumo_utilizado"
                  class="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                  <option value="">Sin consumo de insumo</option>
                  <option *ngFor="let ins of erpService.insumos()" [value]="ins.id_insumo">
                    {{ ins.nombre }} (Stock: {{ ins.stock_actual }} {{ ins.unidad_medida }})
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs text-slate-600 mb-1">Cantidad Consumida</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="cantidad_insumo_utilizado"
                  placeholder="0.00"
                  class="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Campo para notas y dosificación técnica -->
          <div>
            <label class="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
              Observaciones Técnicas / Dosificación
            </label>
            <textarea
              rows="2"
              formControlName="observaciones_tecnicas"
              placeholder="Detalle condiciones de aplicación, clima o recomendaciones..."
              class="w-full p-3 text-sm rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none"></textarea>
          </div>

          <!-- Acción para guardar la labor -->
          <button
            type="submit"
            [disabled]="laborForm.invalid"
            class="w-full p-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-base rounded-2xl shadow-md transition-all touch-target flex items-center justify-center gap-2">
            <span>💾</span>
            <span>Registrar Labor en Terreno</span>
          </button>
        </form>
      </div>

      <!-- Historial cronológico de labores efectuadas -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-600">
          Últimas Labores Registradas
        </div>
        <div class="divide-y divide-slate-100">
          <div *ngFor="let labor of erpService.labores()" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
            <div class="flex items-start gap-3">
              <span class="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-lg">
                {{ getIconoLabor(labor.tipo_labor) }}
              </span>
              <div>
                <div class="font-bold text-slate-900 text-sm">
                  {{ labor.tipo_labor }} • Ciclo #{{ labor.id_ciclo }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">
                  Fecha: {{ labor.fecha_ejecucion }} • Horas: <strong>{{ labor.horas_dedicadas }}h</strong> • Responsable: {{ labor.nombre_responsable }}
                </div>
                <div *ngIf="labor.observaciones_tecnicas" class="text-xs text-slate-600 italic mt-1">
                  "{{ labor.observaciones_tecnicas }}"
                </div>
              </div>
            </div>
            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Labor #{{ labor.id_labor }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegistroLaboresComponent {
  // Servicios de datos y sesión
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Mensaje de éxito tras registrar la faena
  readonly mensajeExito = signal<string | null>(null);

  // Listado de tipos de labores agronómicas contempladas en el sistema
  readonly tiposLabor: TipoLabor[] = [
    'SIEMBRA',
    'RIEGO',
    'FERTILIZACION',
    'FITOSANITARIO',
    'COSECHA'
  ];

  // Formulario reactivo para la captura de faenas
  readonly laborForm: FormGroup = this.fb.group({
    id_ciclo: ['', [Validators.required]],
    tipo_labor: ['RIEGO', [Validators.required]],
    fecha_ejecucion: [new Date().toISOString().split('T')[0], [Validators.required]],
    horas_dedicadas: [4, [Validators.required, Validators.min(0.5)]],
    id_insumo_utilizado: [''],
    cantidad_insumo_utilizado: [null],
    observaciones_tecnicas: ['']
  });

  /**
   * Actualiza el tipo de labor en el formulario al hacer clic sobre el botón correspondiente
   */
  seleccionarTipoLabor(tipo: TipoLabor): void {
    this.laborForm.patchValue({ tipo_labor: tipo });
  }

  /**
   * Retorna el emoji representativo para cada tipo de labor agronómica
   */
  getIconoLabor(tipo: TipoLabor): string {
    switch (tipo) {
      case 'SIEMBRA': return '🌱';
      case 'RIEGO': return '💧';
      case 'FERTILIZACION': return '🧪';
      case 'FITOSANITARIO': return '🛡️';
      case 'COSECHA': return '🧺';
    }
  }

  /**
   * Procesa el formulario, registra la labor en ErpDataService e imputa costos y consumos
   */
  onSubmitLabor(): void {
    if (this.laborForm.invalid) return;

    const val = this.laborForm.value;
    const currentUser = this.authService.currentUser();

    this.erpService.registrarLabor({
      id_ciclo: Number(val.id_ciclo),
      tipo_labor: val.tipo_labor,
      fecha_ejecucion: val.fecha_ejecucion,
      horas_dedicadas: Number(val.horas_dedicadas),
      id_usuario_responsable: currentUser?.id_usuario || 2,
      nombre_responsable: currentUser?.nombre_completo || 'Agrónomo',
      observaciones_tecnicas: val.observaciones_tecnicas,
      id_insumo_utilizado: val.id_insumo_utilizado ? Number(val.id_insumo_utilizado) : undefined,
      cantidad_insumo_utilizado: val.cantidad_insumo_utilizado ? Number(val.cantidad_insumo_utilizado) : undefined
    });

    this.mensajeExito.set(`Labor de ${val.tipo_labor} registrada exitosamente.`);
    this.laborForm.patchValue({
      id_insumo_utilizado: '',
      cantidad_insumo_utilizado: null,
      observaciones_tecnicas: ''
    });
  }
}
