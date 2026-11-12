import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { ModalidadPago } from '../../core/models/enum.types';

@Component({
  selector: 'app-asistencia-jornales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botón -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl" aria-hidden="true">👷</span>
            <h2 class="text-xl font-bold text-slate-800">Asistencia & Jornales de Mano de Obra (HU06)</h2>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Prototipo
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Imputación de horas hombre y cálculo del monto devengado por modalidad de contrato.
          </p>
        </div>

        <button
          type="button"
          (click)="abrirModal()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
          <span>➕</span>
          <span>Registrar Jornada de Trabajo</span>
        </button>
      </div>

      <!-- Banner de Estado Prototipo -->
      <div class="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs sm:text-sm text-amber-900 shadow-xs flex items-start gap-3">
        <span class="text-xl">⚠️</span>
        <div class="space-y-1">
          <div class="font-bold">Módulo Demostrativo / En Integración</div>
          <p class="text-xs text-amber-800">
            Los endpoints para asistencia y jornales de mano de obra (<code class="font-mono bg-amber-100 px-1 py-0.5 rounded">/api/costos/asistencia</code>) están pendientes de implementación en el backend. Los registros se conservan únicamente en memoria de sesión y su estado inicial es <strong>PENDIENTE</strong> hasta confirmación contable.
          </p>
        </div>
      </div>

      <!-- Alerta de Éxito -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold px-2 py-1">✕</button>
      </div>

      <!-- Tabla de Asistencia y Jornales -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Registro de Asistencia Imputada a Ciclos</h3>
          <span class="text-xs text-slate-500 font-mono font-bold">
            Total Devengado: \${{ totalDevengado | number }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">Fecha</th>
                <th class="p-3">Trabajador Agrícola</th>
                <th class="p-3">Ciclo Imputado</th>
                <th class="p-3">Horas</th>
                <th class="p-3">Tarifa / Hora</th>
                <th class="p-3">Monto Devengado</th>
                <th class="p-3">Modalidad</th>
                <th class="p-3">Estado Pago</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let a of erpService.asistencias()" class="hover:bg-slate-50">
                <td class="p-3 text-slate-600 font-mono">{{ a.fecha_jornada }}</td>
                <td class="p-3 font-semibold text-slate-900">{{ a.nombre_trabajador || 'Trabajador #' + a.id_trabajador }}</td>
                <td class="p-3 text-emerald-800 font-medium">Ciclo #{{ a.id_ciclo }}</td>
                <td class="p-3 font-bold text-slate-800">{{ a.horas_trabajadas }}h</td>
                <td class="p-3 font-mono text-slate-600">\${{ a.valor_hora_aplicado | number }}</td>
                <td class="p-3 font-mono font-bold text-slate-900">\${{ a.monto_devengado | number }}</td>
                <td class="p-3 text-slate-600 text-xs">{{ a.modalidad_pago }}</td>
                <td class="p-3">
                  <span
                    [class]="a.estado_pago === 'PAGADO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'"
                    class="px-2 py-0.5 rounded-full text-[11px] font-bold border">
                    {{ a.estado_pago }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="erpService.asistencias().length === 0">
                <td colspan="8" class="p-8 text-center text-slate-500 text-xs">
                  No hay jornadas registradas. Presione "Registrar Jornada de Trabajo" para imputar horas a un ciclo activo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Registro de Asistencia -->
      <div
        *ngIf="modalVisible()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloModalAsistencia"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 id="tituloModalAsistencia" class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>👷</span>
              <span>Registrar Jornal de Mano de Obra</span>
            </h3>
            <button (click)="cerrarModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2">✕</button>
          </div>

          <form [formGroup]="asistenciaForm" (ngSubmit)="onSubmitAsistencia()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nombre del Trabajador *</label>
              <input
                type="text"
                formControlName="nombre_trabajador"
                placeholder="ej. Juan Pérez Morales"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Ciclo Receptor *</label>
                <select formControlName="id_ciclo" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="" disabled>Seleccione ciclo...</option>
                  <option *ngFor="let c of erpService.ciclosActivos()" [value]="c.id_ciclo">
                    Ciclo #{{ c.id_ciclo }}: {{ c.variedad }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Fecha Jornada *</label>
                <input
                  type="date"
                  formControlName="fecha_jornada"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Horas Trab. *</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  formControlName="horas_trabajadas"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Valor Hora ($) *</label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  formControlName="valor_hora_aplicado"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Modalidad *</label>
                <select formControlName="modalidad_pago" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="DIARIA">Diaria</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>
            </div>

            <!-- Previsualización de Monto Devengado -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
              <span class="text-slate-600">Cálculo Automático Devengado:</span>
              <span class="font-bold text-emerald-800 font-mono text-sm">
                \${{ calcularDevengadoPrevio() | number }}
              </span>
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
                [disabled]="asistenciaForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Imputar Jornada
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AsistenciaJornalesComponent {
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  readonly modalVisible = signal(false);
  readonly mensajeExito = signal<string | null>(null);

  readonly asistenciaForm: FormGroup = this.fb.group({
    nombre_trabajador: ['', [Validators.required]],
    id_ciclo: ['', [Validators.required]],
    fecha_jornada: [new Date().toISOString().split('T')[0], [Validators.required]],
    horas_trabajadas: [8, [Validators.required, Validators.min(1), Validators.max(16)]],
    valor_hora_aplicado: [4500, [Validators.required, Validators.min(1000)]],
    modalidad_pago: ['SEMANAL', [Validators.required]]
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarModal();
  }

  get totalDevengado(): number {
    return this.erpService.asistencias().reduce((acc, a) => acc + a.monto_devengado, 0);
  }

  calcularDevengadoPrevio(): number {
    const h = Number(this.asistenciaForm.get('horas_trabajadas')?.value || 0);
    const v = Number(this.asistenciaForm.get('valor_hora_aplicado')?.value || 0);
    return h * v;
  }

  abrirModal(): void {
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  onSubmitAsistencia(): void {
    if (this.asistenciaForm.invalid) return;

    const val = this.asistenciaForm.value;
    const nuevoId = this.erpService.asistencias().length + 1;

    this.erpService.registrarAsistencia({
      id_trabajador: nuevoId,
      nombre_trabajador: val.nombre_trabajador.trim(),
      id_ciclo: Number(val.id_ciclo),
      fecha_jornada: val.fecha_jornada,
      horas_trabajadas: Number(val.horas_trabajadas),
      valor_hora_aplicado: Number(val.valor_hora_aplicado),
      modalidad_pago: val.modalidad_pago,
      estado_pago: 'PENDIENTE'
    });

    this.mensajeExito.set(`Jornal de ${val.nombre_trabajador} registrado con estado PENDIENTE.`);
    this.cerrarModal();
  }
}

