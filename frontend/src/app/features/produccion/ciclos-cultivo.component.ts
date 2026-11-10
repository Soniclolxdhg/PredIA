import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { Nave } from '../../core/models/erp.models';

/**
 * Componente para la gestión de Ciclos de Cultivo e Invernaderos (HU01).
 * Controla la ocupación de las naves y la apertura de nuevos ciclos agrícolas,
 * conectado en tiempo real con PostgreSQL en Supabase a través del backend NestJS.
 */
@Component({
  selector: 'app-ciclos-cultivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con título del módulo y acciones -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏡</span>
            <h2 class="text-xl font-bold text-slate-800">Ciclos de Cultivo & Naves (HU01)</h2>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase En Línea
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Control de ocupación de invernaderos y aperturas de ciclo productivo en base de datos real.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Botón de Sincronización Manual con Supabase -->
          <button
            type="button"
            (click)="recargarDatos()"
            [disabled]="erpService.cargandoCiclos() || erpService.cargandoNaves()"
            title="Sincronizar con Supabase"
            class="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors touch-target">
            <span [class.animate-spin]="erpService.cargandoCiclos() || erpService.cargandoNaves()">🔄</span>
            <span>Sincronizar</span>
          </button>

          <!-- Botón de Apertura de Nuevo Ciclo -->
          <button
            type="button"
            (click)="abrirModal()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
            <span>➕</span>
            <span>Aperturar Nuevo Ciclo</span>
          </button>
        </div>
      </div>

      <!-- Banner Informativo del Modelo Agronómico de Santa Laura Ltda. -->
      <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-emerald-950 shadow-xs">
        <div class="flex items-start gap-3">
          <span class="text-2xl">🍅</span>
          <div>
            <div class="font-bold flex items-center gap-2">
              <span>Especialidad Agrícola Santa Laura Ltda.</span>
              <span class="font-mono text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">SEM-TOM-01</span>
            </div>
            <p class="text-xs text-emerald-800 mt-0.5">
              Cultivo principal: <strong>Tomate Larga Vida</strong> (Naves protegidas con fertirriego). Hortalizas complementarias: <strong>Pimiento Morrón</strong> y hortalizas de hoja en ambiente protegido.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span class="text-xs font-semibold bg-white border border-emerald-300 text-emerald-900 px-3 py-1.5 rounded-xl shadow-2xs">
            Nave 1: Tomate • Nave 2: Pimiento
          </span>
        </div>
      </div>

      <!-- Alertas de estado y validaciones de negocio -->
      <div *ngIf="mensajeError()" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">⚠️ {{ mensajeError() }}</span>
        <button (click)="mensajeError.set(null)" class="text-rose-500 font-bold hover:text-rose-800">✕</button>
      </div>

      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-600 font-bold hover:text-emerald-900">✕</button>
      </div>

      <!-- Tarjetas de estado físico de cada invernadero -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500">
            Estado de Naves e Invernaderos (Superficie Total: {{ totalSuperficie | number }} m²)
          </h3>
          <span class="text-xs font-medium text-slate-500">
            {{ erpService.naves().length }} naves en Supabase
          </span>
        </div>

        <!-- Cargando naves -->
        <div *ngIf="erpService.cargandoNaves()" class="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <span class="inline-block animate-spin text-2xl mb-2">🔄</span>
          <p class="text-xs text-slate-600 font-medium">Cargando naves desde Supabase...</p>
        </div>

        <!-- Estado si no hay naves en Supabase -->
        <div
          *ngIf="!erpService.cargandoNaves() && erpService.naves().length === 0"
          class="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-xs">
          <span class="text-3xl">🏡</span>
          <h4 class="font-bold text-amber-900 mt-2 text-base">La base de datos de Supabase no tiene naves inicializadas</h4>
          <p class="text-xs text-amber-700 max-w-lg mx-auto mt-1 mb-4">
            Para aperturar ciclos de cultivo en Santa Laura Ltda., se requiere registrar las 4 naves base (NAV-01 a NAV-04) en la tabla <code class="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">naves</code> de Supabase.
          </p>
          <button
            type="button"
            (click)="sembrarNaves()"
            [disabled]="sembrando() || erpService.cargandoNaves()"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors touch-target">
            <span [class.animate-spin]="sembrando()">🌱</span>
            <span>{{ sembrando() ? 'Inicializando en Supabase...' : 'Inicializar Naves de Santa Laura Ltda. en Supabase' }}</span>
          </button>
        </div>

        <!-- Grilla de naves existentes en Supabase -->
        <div
          *ngIf="!erpService.cargandoNaves() && erpService.naves().length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <!-- Listado histórico y ciclos actualmente activos -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Historial y Ciclos Activos de la Temporada</h3>
          <span class="text-xs text-slate-500">{{ erpService.ciclos().length }} ciclos en Supabase</span>
        </div>

        <!-- Indicador de carga de ciclos -->
        <div *ngIf="erpService.cargandoCiclos()" class="p-8 text-center bg-white">
          <span class="inline-block animate-spin text-2xl mb-2">🔄</span>
          <p class="text-xs text-slate-600 font-medium">Consultando tabla 'ciclos_cultivo' en Supabase...</p>
        </div>

        <!-- Estado vacío real (cuando la tabla de Supabase está vacía) -->
        <div
          *ngIf="!erpService.cargandoCiclos() && erpService.ciclos().length === 0"
          class="p-8 text-center bg-white">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl mb-3">
            📋
          </div>
          <h4 class="font-bold text-slate-800 text-sm">No hay ciclos de cultivo registrados en la base de datos de Supabase</h4>
          <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Actualmente la tabla <code class="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">ciclos_cultivo</code> no contiene registros. Haz clic en "Aperturar Nuevo Ciclo" para registrar un ciclo productivo en la base de datos real.
          </p>
          <button
            type="button"
            (click)="abrirModal()"
            class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors">
            <span>➕</span>
            <span>Aperturar Nuevo Ciclo</span>
          </button>
        </div>

        <!-- Tabla con ciclos reales de Supabase -->
        <div
          *ngIf="!erpService.cargandoCiclos() && erpService.ciclos().length > 0"
          class="overflow-x-auto">
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
                  #{{ ciclo.id_ciclo }} • <span class="text-xs text-slate-500">{{ ciclo.temporada }}</span>
                </td>
                <td class="p-3">
                  <span class="font-medium text-slate-700">{{ getNaveNombre(ciclo.id_nave) }}</span>
                </td>
                <td class="p-3">
                  <div class="font-bold text-emerald-900">{{ ciclo.variedad }}</div>
                  <span *ngIf="ciclo.variedad.includes('Tomate')" class="inline-block text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-bold mt-0.5">
                    Especialidad • SEM-TOM-01
                  </span>
                  <span *ngIf="ciclo.variedad.includes('Pimiento')" class="inline-block text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold mt-0.5">
                    Complementaria
                  </span>
                </td>
                <td class="p-3 text-slate-600 text-xs">
                  {{ ciclo.fecha_inicio }} → {{ ciclo.fecha_termino_estimada }}
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

      <!-- Ventana modal con validación de nave ocupada -->
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
            <!-- Selección de invernadero destino -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Invernadero / Nave Destino *</label>
              <select formControlName="id_nave" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione una nave...</option>
                <option *ngFor="let n of erpService.naves()" [value]="n.id_nave">
                  {{ n.codigo_nave }} - {{ n.nombre }} ({{ n.estado }})
                </option>
              </select>
              <p class="text-[11px] text-slate-500 mt-1">
                * Regla de negocio: No se permite aperturar si la nave ya tiene un ciclo ACTIVO en Supabase.
              </p>
            </div>

            <!-- Temporada y variedad vegetal -->
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
                <div class="flex flex-wrap gap-1 mb-1.5">
                  <button
                    type="button"
                    (click)="seleccionarVariedadPredefinida('Tomate Larga Vida')"
                    class="text-[10px] px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold border border-emerald-300 transition-colors">
                    🍅 Tomate (SEM-TOM-01)
                  </button>
                  <button
                    type="button"
                    (click)="seleccionarVariedadPredefinida('Pimiento Cuadrado Rojo')"
                    class="text-[10px] px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold border border-amber-300 transition-colors">
                    🫑 Pimiento
                  </button>
                  <button
                    type="button"
                    (click)="seleccionarVariedadPredefinida('Hortalizas de Hoja Protegidas')"
                    class="text-[10px] px-2 py-0.5 rounded bg-teal-100 hover:bg-teal-200 text-teal-800 font-bold border border-teal-300 transition-colors">
                    🥬 Hortalizas
                  </button>
                </div>
                <input
                  type="text"
                  formControlName="variedad"
                  placeholder="ej. Tomate Larga Vida"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <!-- Fechas de inicio y estimación de cierre -->
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

            <!-- Acciones del formulario -->
            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModal()"
                [disabled]="guardando()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="cicloForm.invalid || guardando()"
                class="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                <span *ngIf="guardando()" class="inline-block animate-spin">🔄</span>
                <span>{{ guardando() ? 'Guardando en Supabase...' : 'Guardar y Aperturar' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class CiclosCultivoComponent implements OnInit {
  // Inyección de servicios centrales
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  // Señales reactivas para la interfaz
  readonly modalVisible = signal(false);
  readonly guardando = signal(false);
  readonly sembrando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Formulario reactivo para la apertura del ciclo productivo
  readonly cicloForm: FormGroup = this.fb.group({
    id_nave: ['', [Validators.required]],
    temporada: ['PRIMAVERA_2026', [Validators.required]],
    variedad: ['', [Validators.required, Validators.minLength(3)]],
    fecha_inicio: [new Date().toISOString().split('T')[0], [Validators.required]],
    fecha_termino_estimada: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.recargarDatos();
  }

  /**
   * Carga o actualiza tanto las naves como los ciclos directamente desde Supabase
   */
  recargarDatos(): void {
    this.erpService.cargarNaves().subscribe();
    this.erpService.cargarCiclos().subscribe();
  }

  /**
   * Calcula la superficie total acumulada sumando los metros cuadrados de todas las naves
   */
  get totalSuperficie(): number {
    return this.erpService.naves().reduce((acc, n) => acc + n.superficie_m2, 0);
  }

  /**
   * Busca y retorna el nombre y código de la nave a partir de su ID
   */
  getNaveNombre(idNave: number): string {
    const nave = this.erpService.naves().find((n) => n.id_nave === idNave);
    return nave ? `${nave.nombre} (${nave.codigo_nave})` : `Nave #${idNave}`;
  }

  /**
   * Retorna las clases visuales de Tailwind según el estado de la nave
   */
  getClaseEstadoNave(estado: string): string {
    switch (estado) {
      case 'EN_CULTIVO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPONIBLE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANTENCION': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  /**
   * Siembra las 4 naves base de Santa Laura Ltda. en Supabase si la tabla está vacía
   */
  sembrarNaves(): void {
    this.sembrando.set(true);
    this.mensajeError.set(null);

    this.erpService.sembrarNavesBase().subscribe({
      next: (res) => {
        this.sembrando.set(false);
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
        } else {
          this.mensajeError.set(res.mensaje);
        }
      },
      error: () => {
        this.sembrando.set(false);
        this.mensajeError.set('No fue posible conectar con el servidor para inicializar naves.');
      }
    });
  }

  /**
   * Abre la ventana modal y restablece los valores del formulario al día actual
   */
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

  /**
   * Cierra la ventana modal de apertura de ciclo
   */
  cerrarModal(): void {
    this.modalVisible.set(false);
  }

  /**
   * Asigna con un solo toque una de las variedades características de Santa Laura Ltda.
   */
  seleccionarVariedadPredefinida(variedad: string): void {
    this.cicloForm.patchValue({ variedad });
  }

  /**
   * Procesa la solicitud de apertura enviándola a Supabase a través del backend REST
   */
  onSubmitCiclo(): void {
    if (this.cicloForm.invalid) return;

    this.guardando.set(true);
    this.mensajeError.set(null);

    this.erpService.crearCicloCultivo(this.cicloForm.value).subscribe({
      next: (res) => {
        this.guardando.set(false);
        if (!res.exito) {
          this.mensajeError.set(res.mensaje);
        } else {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModal();
        }
      },
      error: () => {
        this.guardando.set(false);
        this.mensajeError.set('Error inesperado de comunicación con la base de datos de Supabase.');
      }
    });
  }
}
