import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { CostosApiService } from '../../core/services/costos-api.service';
import { AsistenciaJornal } from '../../core/models/erp.models';
import { TrabajadorDto, CrearAsistenciaDto, CrearTrabajadorDto } from '../../core/models/dtos';

@Component({
  selector: 'app-asistencia-jornales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botones -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl" aria-hidden="true">👷</span>
            <h2 class="text-xl font-bold text-slate-800">Asistencia & Jornales de Mano de Obra</h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Imputación de horas hombre y cálculo del monto devengado por modalidad de contrato.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="abrirModalTrabajador()"
            class="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors">
            <span>👤</span>
            <span>+ Nuevo Trabajador</span>
          </button>

          <button
            type="button"
            (click)="abrirModal()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
            <span>➕</span>
            <span>Registrar Jornada de Trabajo</span>
          </button>
        </div>
      </div>

      <!-- Banner Informativo -->
      <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-900 shadow-xs flex items-start gap-3">
        <span class="text-xl">ℹ️</span>
        <div class="space-y-1">
          <div class="font-bold">Módulo de Costos & Mano de Obra (Fase 4)</div>
          <p class="text-xs text-emerald-800">
            Registro de horas hombre e imputación directa al ciclo productivo activo. Permite controlar el valor devengado y conciliar el estado de pago de jornales (Pendiente / Pagado).
          </p>
        </div>
      </div>

      <!-- Alerta de Éxito o Error -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold px-2 py-1">✕</button>
      </div>

      <div *ngIf="mensajeError()" class="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">⚠️ {{ mensajeError() }}</span>
        <button (click)="mensajeError.set(null)" class="text-rose-700 font-bold px-2 py-1">✕</button>
      </div>

      <!-- Selector de Pestañas -->
      <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          (click)="pestanaActiva.set('JORNADAS')"
          [class]="pestanaActiva() === 'JORNADAS' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2">
          <span>📋</span>
          <span>Jornadas & Asistencias ({{ erpService.asistencias().length }})</span>
        </button>

        <button
          type="button"
          (click)="pestanaActiva.set('TRABAJADORES')"
          [class]="pestanaActiva() === 'TRABAJADORES' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2">
          <span>👥</span>
          <span>Plantilla de Trabajadores Agrícolas ({{ trabajadores().length }})</span>
        </button>
      </div>

      <!-- Tabla de Asistencia y Jornales (Pestaña Jornadas) -->
      <div *ngIf="pestanaActiva() === 'JORNADAS'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
                <th class="p-3 text-right">Acción</th>
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
                <td class="p-3 text-right">
                  <button
                    *ngIf="a.estado_pago === 'PENDIENTE'"
                    type="button"
                    (click)="cambiarEstadoPago(a, 'PAGADO')"
                    class="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
                    💳 Marcar Pagado
                  </button>
                  <span *ngIf="a.estado_pago === 'PAGADO'" class="text-xs text-emerald-600 font-semibold">
                    ✓ Pagado
                  </span>
                </td>
              </tr>
              <tr *ngIf="erpService.asistencias().length === 0">
                <td colspan="9" class="p-8 text-center text-slate-500 text-xs">
                  No hay jornadas registradas. Presione "Registrar Jornada de Trabajo" para imputar horas a un ciclo activo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tabla de Trabajadores Agrícolas (Pestaña Trabajadores) -->
      <div *ngIf="pestanaActiva() === 'TRABAJADORES'" class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Directorio de Trabajadores Agrícolas Registrados</h3>
          <button
            type="button"
            (click)="abrirModalTrabajador()"
            class="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors">
            + Registrar Trabajador
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">ID / RUT</th>
                <th class="p-3">Nombre Completo</th>
                <th class="p-3">Cargo Operacional</th>
                <th class="p-3">Modalidad Contrato</th>
                <th class="p-3">Tarifa Base ($/h)</th>
                <th class="p-3">Estado</th>
                <th class="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let t of trabajadores()" class="hover:bg-slate-50">
                <td class="p-3 font-mono text-slate-600">
                  <span class="font-bold text-slate-900">#{{ t.idTrabajador }}</span> &bull; {{ t.rut }}
                </td>
                <td class="p-3 font-semibold text-slate-900">
                  {{ t.nombres }} {{ t.apellidos }}
                </td>
                <td class="p-3 text-slate-700 font-medium">
                  {{ formatCargo(t.cargo) }}
                </td>
                <td class="p-3 text-slate-600">
                  <span class="px-2 py-0.5 rounded-full bg-slate-100 border text-[11px] font-bold">
                    {{ t.modalidadPago }}
                  </span>
                </td>
                <td class="p-3 font-mono font-bold text-emerald-800">
                  \${{ t.tarifaBase | number }}
                </td>
                <td class="p-3">
                  <span
                    [class]="t.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'"
                    class="px-2 py-0.5 rounded-full text-[11px] font-bold border">
                    {{ t.activo ? 'ACTIVO' : 'INACTIVO' }}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <button
                    type="button"
                    (click)="abrirModalParaTrabajador(t)"
                    class="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors">
                    ➕ Imputar Jornada
                  </button>
                </td>
              </tr>
              <tr *ngIf="trabajadores().length === 0">
                <td colspan="7" class="p-8 text-center text-slate-500 text-xs">
                  No hay trabajadores registrados en la base de datos. Presione "+ Nuevo Trabajador" para agregar colaboradores agrícolas.
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
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Trabajador Agrícola Registrado *</label>
                <button
                  type="button"
                  (click)="abrirModalTrabajador()"
                  class="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline">
                  + Registrar nuevo
                </button>
              </div>

              <select
                formControlName="id_trabajador"
                (change)="onTrabajadorSeleccionado()"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione trabajador...</option>
                <option *ngFor="let t of trabajadores()" [value]="t.idTrabajador">
                  {{ t.nombres }} {{ t.apellidos }} ({{ t.rut }}) - {{ t.cargo }}
                </option>
              </select>
              <p *ngIf="trabajadores().length === 0" class="text-xs text-amber-600 mt-1">
                ⚠️ No hay trabajadores registrados. Haz clic en "+ Registrar nuevo" para agregar uno.
              </p>
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
                <label class="block text-xs font-bold text-slate-700 mb-1">Modalidad</label>
                <input
                  type="text"
                  formControlName="modalidad_pago"
                  readonly
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold focus:outline-none"
                />
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

      <!-- Modal de Registro de Nuevo Trabajador -->
      <div
        *ngIf="modalTrabajadorVisible()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tituloModalTrabajador"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 id="tituloModalTrabajador" class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>👤</span>
              <span>Registrar Trabajador Agrícola</span>
            </h3>
            <button (click)="cerrarModalTrabajador()" class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2">✕</button>
          </div>

          <form [formGroup]="trabajadorForm" (ngSubmit)="onSubmitNuevoTrabajador()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nombres *</label>
                <input
                  type="text"
                  formControlName="nombres"
                  placeholder="ej. Carlos"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Apellidos *</label>
                <input
                  type="text"
                  formControlName="apellidos"
                  placeholder="ej. Muñoz Silva"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">RUT *</label>
                <input
                  type="text"
                  formControlName="rut"
                  placeholder="12.345.678-9"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Cargo *</label>
                <select formControlName="cargo" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="OPERARIO_CAMPO">Operario de Campo</option>
                  <option value="COSECHADOR">Cosechador</option>
                  <option value="CHOFER">Chofer</option>
                  <option value="MECANICO">Mecánico</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Modalidad Pago *</label>
                <select formControlName="modalidadPago" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                  <option value="DIARIO">Diario</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="MENSUAL">Mensual</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tarifa Base / Hora ($) *</label>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  formControlName="tarifaBase"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModalTrabajador()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="trabajadorForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Guardar Trabajador
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AsistenciaJornalesComponent implements OnInit {
  readonly erpService = inject(ErpDataService);
  private readonly costosApi = inject(CostosApiService);
  private readonly fb = inject(FormBuilder);

  readonly pestanaActiva = signal<'JORNADAS' | 'TRABAJADORES'>('JORNADAS');
  readonly modalVisible = signal(false);
  readonly modalTrabajadorVisible = signal(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly trabajadores = signal<TrabajadorDto[]>([]);

  readonly asistenciaForm: FormGroup = this.fb.group({
    id_trabajador: ['', [Validators.required]],
    id_ciclo: ['', [Validators.required]],
    fecha_jornada: [new Date().toISOString().split('T')[0], [Validators.required]],
    horas_trabajadas: [8, [Validators.required, Validators.min(1), Validators.max(16)]],
    valor_hora_aplicado: [4500, [Validators.required, Validators.min(1000)]],
    modalidad_pago: ['SEMANAL']
  });

  readonly trabajadorForm: FormGroup = this.fb.group({
    rut: ['', [Validators.required]],
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    cargo: ['OPERARIO_CAMPO', [Validators.required]],
    modalidadPago: ['SEMANAL', [Validators.required]],
    tarifaBase: [4500, [Validators.required, Validators.min(1000)]]
  });

  ngOnInit(): void {
    this.cargarTrabajadores();
    this.cargarAsistencias();
  }

  sanitizar(texto: string | null | undefined): string {
    if (!texto) return '';
    return texto.replace(/\uFFFD/g, 'é').replace(/Prez/g, 'Pérez').replace(/Perez/g, 'Pérez');
  }

  formatCargo(cargo: string): string {
    switch (cargo) {
      case 'OPERARIO_CAMPO': return 'Operario de Campo';
      case 'COSECHADOR': return 'Cosechador';
      case 'CHOFER': return 'Chofer';
      case 'MECANICO': return 'Mecánico';
      default: return cargo;
    }
  }

  abrirModalParaTrabajador(t: TrabajadorDto): void {
    this.asistenciaForm.patchValue({
      id_trabajador: t.idTrabajador,
      valor_hora_aplicado: Number(t.tarifaBase) || 4500,
      modalidad_pago: t.modalidadPago || 'SEMANAL'
    });
    this.modalVisible.set(true);
  }

  cargarTrabajadores(): void {
    this.costosApi.listarTrabajadores().subscribe({
      next: (lista) => {
        if (lista && Array.isArray(lista)) {
          const limpias = lista.map((t) => ({
            ...t,
            nombres: this.sanitizar(t.nombres),
            apellidos: this.sanitizar(t.apellidos)
          }));
          this.trabajadores.set(limpias);
          if (limpias.length > 0 && !this.asistenciaForm.get('id_trabajador')?.value) {
            this.asistenciaForm.patchValue({
              id_trabajador: limpias[0].idTrabajador,
              valor_hora_aplicado: Number(limpias[0].tarifaBase) || 4500,
              modalidad_pago: limpias[0].modalidadPago || 'SEMANAL'
            });
          }
        }
      },
      error: (err) => {
        console.warn('⚠️ No se pudo obtener la lista de trabajadores desde el backend:', err);
      }
    });
  }

  cargarAsistencias(): void {
    this.costosApi.listarAsistencias().subscribe({
      next: (lista) => {
        if (lista && Array.isArray(lista) && lista.length > 0) {
          const normalizadas: AsistenciaJornal[] = lista.map((a: any) => {
            const nom = a.trabajador 
              ? `${this.sanitizar(a.trabajador.nombres)} ${this.sanitizar(a.trabajador.apellidos)}` 
              : `Trabajador #${a.idTrabajador}`;
            return {
              id_asistencia: a.idAsistencia,
              id_trabajador: a.idTrabajador,
              nombre_trabajador: nom,
              id_ciclo: a.idCiclo,
              fecha_jornada: typeof a.fechaJornada === 'string' ? a.fechaJornada.split('T')[0] : a.fechaJornada,
              horas_trabajadas: Number(a.horasTrabajadas),
              valor_hora_aplicado: Number(a.valorHoraAplicado),
              monto_devengado: Number(a.montoDevengado),
              modalidad_pago: a.trabajador?.modalidadPago || 'SEMANAL',
              estado_pago: a.estadoPago || 'PENDIENTE'
            };
          });
          this.erpService.setAsistencias(normalizadas);
        }
      },
      error: (err) => {
        console.warn('⚠️ No se pudo obtener asistencias del backend:', err);
      }
    });
  }

  onTrabajadorSeleccionado(): void {
    const id = Number(this.asistenciaForm.get('id_trabajador')?.value);
    const trabajador = this.trabajadores().find(t => t.idTrabajador === id);
    if (trabajador) {
      this.asistenciaForm.patchValue({
        valor_hora_aplicado: Number(trabajador.tarifaBase) || 4500,
        modalidad_pago: trabajador.modalidadPago || 'SEMANAL'
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarModal();
    this.cerrarModalTrabajador();
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

  abrirModalTrabajador(): void {
    this.modalTrabajadorVisible.set(true);
  }

  cerrarModalTrabajador(): void {
    this.modalTrabajadorVisible.set(false);
  }

  onSubmitNuevoTrabajador(): void {
    if (this.trabajadorForm.invalid) return;

    const val = this.trabajadorForm.value;
    const dto: CrearTrabajadorDto = {
      rut: val.rut.trim(),
      nombres: val.nombres.trim(),
      apellidos: val.apellidos.trim(),
      cargo: val.cargo,
      modalidadPago: val.modalidadPago,
      tarifaBase: Number(val.tarifaBase),
      activo: true
    };

    this.costosApi.crearTrabajador(dto).subscribe({
      next: (nuevo) => {
        this.trabajadores.update(prev => [...prev, nuevo]);
        this.asistenciaForm.patchValue({
          id_trabajador: nuevo.idTrabajador,
          valor_hora_aplicado: Number(nuevo.tarifaBase),
          modalidad_pago: nuevo.modalidadPago
        });
        this.mensajeExito.set(`Trabajador ${nuevo.nombres} ${nuevo.apellidos} registrado exitosamente.`);
        this.cerrarModalTrabajador();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al registrar el trabajador.';
        this.mensajeError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    });
  }

  onSubmitAsistencia(): void {
    if (this.asistenciaForm.invalid) return;

    const val = this.asistenciaForm.value;
    const trabajador = this.trabajadores().find(t => t.idTrabajador === Number(val.id_trabajador));
    const nombre = trabajador ? `${trabajador.nombres} ${trabajador.apellidos}` : `Trabajador #${val.id_trabajador}`;

    const dto: CrearAsistenciaDto = {
      idTrabajador: Number(val.id_trabajador),
      idCiclo: Number(val.id_ciclo),
      fechaJornada: val.fecha_jornada,
      horasTrabajadas: Number(val.horas_trabajadas),
      valorHoraAplicado: Number(val.valor_hora_aplicado)
    };

    this.costosApi.registrarAsistencia(dto).subscribe({
      next: (res) => {
        this.erpService.registrarAsistencia({
          id_trabajador: Number(val.id_trabajador),
          nombre_trabajador: nombre,
          id_ciclo: Number(val.id_ciclo),
          fecha_jornada: val.fecha_jornada,
          horas_trabajadas: Number(val.horas_trabajadas),
          valor_hora_aplicado: Number(val.valor_hora_aplicado),
          modalidad_pago: (trabajador?.modalidadPago as any) || 'SEMANAL',
          estado_pago: 'PENDIENTE'
        });
        this.mensajeExito.set(`Jornal de ${nombre} imputado con éxito al Ciclo #${val.id_ciclo}.`);
        this.cerrarModal();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al imputar jornada en backend.';
        this.mensajeError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    });
  }

  cambiarEstadoPago(a: AsistenciaJornal, nuevoEstado: 'PAGADO' | 'PENDIENTE' | 'CONCILIADO'): void {
    this.costosApi.actualizarEstadoPago(a.id_asistencia, { estadoPago: nuevoEstado }).subscribe({
      next: () => {
        this.erpService.actualizarEstadoPagoAsistencia(a.id_asistencia, nuevoEstado);
        this.mensajeExito.set(`Jornada #${a.id_asistencia} actualizada a ${nuevoEstado}.`);
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al actualizar estado en backend.';
        this.mensajeError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    });
  }
}
