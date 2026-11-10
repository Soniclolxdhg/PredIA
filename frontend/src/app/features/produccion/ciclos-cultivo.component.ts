import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { Nave } from '../../core/models/erp.models';

/**
 * Componente para la gestión de Ciclos de Cultivo e Invernaderos (HU01).
 * Controla la creación de naves y la apertura de ciclos agrícolas,
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
            Gestión de infraestructura de naves y aperturas de ciclo productivo en base de datos real.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
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

          <!-- Botón para Crear Nueva Nave -->
          <button
            type="button"
            (click)="abrirModalNave()"
            class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300 shadow-xs transition-colors touch-target">
            <span>🏡</span>
            <span>Nueva Nave</span>
          </button>

          <!-- Botón de Apertura de Nuevo Ciclo -->
          <button
            type="button"
            (click)="abrirModalCiclo()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
            <span>🌱</span>
            <span>Aperturar Ciclo</span>
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

      <!-- Sección: Estado de Naves e Invernaderos -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-500">
              Estado de Naves e Invernaderos (Superficie Total: {{ totalSuperficie | number }} m²)
            </h3>
            <span class="text-xs font-medium text-slate-500">
              {{ erpService.naves().length }} naves registradas en Supabase
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="abrirModalNave()"
              class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors touch-target">
              <span>➕</span>
              <span>Registrar Nueva Nave</span>
            </button>
          </div>
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
            Para aperturar ciclos de cultivo en Santa Laura Ltda., se requiere registrar naves en la tabla <code class="font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">naves</code> de Supabase. Puedes sembrar las 4 naves base oficiales o registrar una nueva nave manualmente.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              (click)="sembrarNaves()"
              [disabled]="sembrando() || erpService.cargandoNaves()"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors touch-target">
              <span [class.animate-spin]="sembrando()">🌱</span>
              <span>{{ sembrando() ? 'Inicializando en Supabase...' : 'Sembrar 4 Naves Base de Santa Laura Ltda.' }}</span>
            </button>
            <button
              type="button"
              (click)="abrirModalNave()"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition-colors touch-target">
              <span>➕</span>
              <span>Crear Nave Manualmente</span>
            </button>
          </div>
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

      <!-- Sección: Listado histórico y ciclos actualmente activos -->
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
            Actualmente la tabla <code class="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">ciclos_cultivo</code> no contiene registros. Haz clic en "Aperturar Ciclo" para registrar el primer ciclo productivo en la base de datos real.
          </p>
          <button
            type="button"
            (click)="abrirModalCiclo()"
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

      <!-- MODAL 1: REGISTRAR NUEVA NAVE EN SUPABASE -->
      <div
        *ngIf="modalNaveVisible()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🏡</span>
              <span>Registrar Nueva Nave en Supabase</span>
            </h3>
            <button (click)="cerrarModalNave()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="naveForm" (ngSubmit)="onSubmitNave()" class="space-y-4">
            <!-- Código de Nave -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700">Código de Nave *</label>
                <span class="text-[10px] text-slate-400 font-mono">Único en tabla naves</span>
              </div>
              <div class="flex flex-wrap gap-1.5 mb-1.5">
                <button
                  type="button"
                  *ngFor="let cod of sugerenciasCodigo"
                  (click)="sugerirCodigo(cod)"
                  class="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono font-bold text-slate-700 border border-slate-200 transition-colors">
                  {{ cod }}
                </button>
              </div>
              <input
                type="text"
                formControlName="codigo_nave"
                placeholder="ej. NAV-01, NAV-05"
                class="w-full p-2.5 text-sm uppercase font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <!-- Nombre Descriptivo -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nombre Descriptivo *</label>
              <input
                type="text"
                formControlName="nombre"
                placeholder="ej. Nave 1 - Tomate Larga Vida"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <!-- Superficie en m² -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Superficie (m²) *</label>
              <input
                type="number"
                formControlName="superficie_m2"
                placeholder="ej. 2500"
                min="10"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <!-- Tipo de Estructura -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tipo de Estructura *</label>
              <select formControlName="tipo_estructura" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="Multitúnel Metal">Multitúnel Metal</option>
                <option value="Túnel Simple">Túnel Simple</option>
                <option value="Invernadero Climatizado">Invernadero Climatizado</option>
                <option value="Sombreadero Malla Raschel">Sombreadero Malla Raschel</option>
                <option value="Capilla Tradicional">Capilla Tradicional</option>
              </select>
            </div>

            <!-- Acciones -->
            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModalNave()"
                [disabled]="guardandoNave()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="naveForm.invalid || guardandoNave()"
                class="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                <span *ngIf="guardandoNave()" class="inline-block animate-spin">🔄</span>
                <span>{{ guardandoNave() ? 'Guardando en Supabase...' : 'Guardar Nave en Supabase' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: APERTURA DE NUEVO CICLO -->
      <div
        *ngIf="modalCicloVisible()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>🌱</span>
              <span>Aperturar Nuevo Ciclo de Cultivo</span>
            </h3>
            <button (click)="cerrarModalCiclo()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
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
                (click)="cerrarModalCiclo()"
                [disabled]="guardandoCiclo()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="cicloForm.invalid || guardandoCiclo()"
                class="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                <span *ngIf="guardandoCiclo()" class="inline-block animate-spin">🔄</span>
                <span>{{ guardandoCiclo() ? 'Guardando en Supabase...' : 'Guardar y Aperturar' }}</span>
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

  // Señales reactivas para ventanas modales y estado
  readonly modalCicloVisible = signal(false);
  readonly modalNaveVisible = signal(false);
  readonly guardandoCiclo = signal(false);
  readonly guardandoNave = signal(false);
  readonly sembrando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Sugerencias rápidas de códigos de naves
  readonly sugerenciasCodigo = ['NAV-01', 'NAV-02', 'NAV-03', 'NAV-04', 'NAV-05'];

  // Formulario reactivo para la creación de nueva Nave
  readonly naveForm: FormGroup = this.fb.group({
    codigo_nave: ['', [Validators.required, Validators.minLength(3)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    superficie_m2: [2500, [Validators.required, Validators.min(10)]],
    tipo_estructura: ['Multitúnel Metal', [Validators.required]]
  });

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

  // ==========================================
  // GESTIÓN MODAL: CREAR NAVE
  // ==========================================

  abrirModalNave(): void {
    const totalActual = this.erpService.naves().length;
    const proxNum = totalActual + 1;
    const proxCod = `NAV-${proxNum < 10 ? '0' + proxNum : proxNum}`;

    this.naveForm.reset({
      codigo_nave: proxCod,
      nombre: `Nave ${proxNum} - Invernadero`,
      superficie_m2: 2500,
      tipo_estructura: 'Multitúnel Metal'
    });
    this.mensajeError.set(null);
    this.modalNaveVisible.set(true);
  }

  cerrarModalNave(): void {
    this.modalNaveVisible.set(false);
  }

  sugerirCodigo(cod: string): void {
    this.naveForm.patchValue({ codigo_nave: cod });
  }

  onSubmitNave(): void {
    if (this.naveForm.invalid) return;

    this.guardandoNave.set(true);
    this.mensajeError.set(null);

    this.erpService.crearNave(this.naveForm.value).subscribe({
      next: (res) => {
        this.guardandoNave.set(false);
        if (!res.exito) {
          this.mensajeError.set(res.mensaje);
        } else {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalNave();
        }
      },
      error: () => {
        this.guardandoNave.set(false);
        this.mensajeError.set('Error inesperado al conectar con Supabase para registrar la nave.');
      }
    });
  }

  // ==========================================
  // GESTIÓN MODAL: APERTURAR CICLO
  // ==========================================

  abrirModalCiclo(): void {
    this.cicloForm.reset({
      id_nave: '',
      temporada: 'PRIMAVERA_2026',
      variedad: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_termino_estimada: ''
    });
    this.mensajeError.set(null);
    this.modalCicloVisible.set(true);
  }

  cerrarModalCiclo(): void {
    this.modalCicloVisible.set(false);
  }

  seleccionarVariedadPredefinida(variedad: string): void {
    this.cicloForm.patchValue({ variedad });
  }

  onSubmitCiclo(): void {
    if (this.cicloForm.invalid) return;

    this.guardandoCiclo.set(true);
    this.mensajeError.set(null);

    this.erpService.crearCicloCultivo(this.cicloForm.value).subscribe({
      next: (res) => {
        this.guardandoCiclo.set(false);
        if (!res.exito) {
          this.mensajeError.set(res.mensaje);
        } else {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalCiclo();
        }
      },
      error: () => {
        this.guardandoCiclo.set(false);
        this.mensajeError.set('Error inesperado de comunicación con la base de datos de Supabase.');
      }
    });
  }
}
