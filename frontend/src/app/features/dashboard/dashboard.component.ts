import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ErpDataService } from '../../core/services/erp-data.service';

/**
 * Panel de Control Principal (Dashboard) del Sistema PredIA.
 * Ofrece una visión global consolidada de la operación agrícola en Santa Laura Ltda.,
 * mostrando métricas en tiempo real obtenidas desde el backend NestJS y Supabase PostgreSQL.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Banner de Bienvenida Institucional -->
      <div class="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-1 rounded-full">
            PredIA &bull; Santa Laura Ltda.
          </span>
          <h1 class="text-2xl font-black mt-2">
            Panel de Control General
          </h1>
          <p class="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
            Bienvenido, <strong>{{ authService.currentUser()?.nombre_completo }}</strong>. Sistema de gestión agronómica, trazabilidad de invernaderos y control de inventario sincronizado con Supabase.
          </p>
        </div>

        <div class="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center self-start sm:self-auto min-w-[170px]">
          <div class="text-xs text-emerald-200 uppercase font-bold">Sesión Activa</div>
          <div class="text-lg font-black text-white mt-0.5 flex items-center justify-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>{{ authService.userRole() }}</span>
          </div>
          <div class="text-[11px] text-emerald-200 mt-1 font-mono">{{ authService.currentUser()?.email }}</div>
        </div>
      </div>

      <!-- Tarjetas de Métricas Principales en Tiempo Real -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Naves Registradas -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>INVERNADEROS / NAVES</span>
            <span>🏡</span>
          </div>
          <div class="text-2xl font-black text-slate-800 font-mono">
            {{ erpService.naves().length }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">
            Superficie: <strong>{{ totalSuperficieM2() | number }} m²</strong>
          </p>
        </div>

        <!-- Ciclos Activos -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>CICLOS PRODUCTIVOS</span>
            <span>🌱</span>
          </div>
          <div class="text-2xl font-black text-emerald-600 font-mono">
            {{ erpService.ciclosActivos().length }} activos
          </div>
          <p class="text-[11px] text-slate-500 mt-1">
            Total histórico: {{ erpService.ciclos().length }} ciclos
          </p>
        </div>

        <!-- Insumos en Bodega -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>INSUMOS BODEGA</span>
            <span>📦</span>
          </div>
          <div class="text-2xl font-black text-amber-600 font-mono">
            {{ erpService.insumos().length }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">
            <span *ngIf="erpService.insumosCriticos().length === 0" class="text-emerald-600 font-bold">Stock normal</span>
            <span *ngIf="erpService.insumosCriticos().length > 0" class="text-rose-600 font-bold">
              {{ erpService.insumosCriticos().length }} en stock crítico
            </span>
          </p>
        </div>

        <!-- Colaboradores Registrados -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>COLABORADORES</span>
            <span>👥</span>
          </div>
          <div class="text-2xl font-black text-purple-600 font-mono">
            {{ authService.usuarios().length }}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">
            Cuentas con perfil RBAC asignado
          </p>
        </div>
      </div>

      <!-- Accesos Rápidos según Perfil de Usuario -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <span>🚀</span>
          <span>Accesos Rápidos a Módulos del Sistema</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <!-- Producción: Ciclos & Naves -->
          <a
            routerLink="/produccion/ciclos"
            class="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-emerald-100 rounded-xl group-hover:scale-105 transition-transform">🏡</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Ciclos & Naves (HU01)</div>
              <p class="text-xs text-slate-500 mt-0.5">Control de invernaderos, fechas de siembra y apertura de ciclo.</p>
            </div>
          </a>

          <!-- Producción: Checklist de Terreno -->
          <a
            routerLink="/produccion/checklist"
            class="p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-emerald-100 rounded-xl group-hover:scale-105 transition-transform">📋</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Checklist Naves (Tablet)</div>
              <p class="text-xs text-slate-500 mt-0.5">Supervisión física de ventilación, sensores y mallas en terreno.</p>
            </div>
          </a>

          <!-- Bodega: Kardex & Mermas -->
          <a
            routerLink="/bodega/kardex"
            class="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-amber-100 rounded-xl group-hover:scale-105 transition-transform">📦</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Kardex & Mermas (HU04)</div>
              <p class="text-xs text-slate-500 mt-0.5">Entradas, salidas y merma de semillas con costeo PMP.</p>
            </div>
          </a>

          <!-- Bodega: Alertas de Stock -->
          <a
            routerLink="/bodega/alertas"
            class="p-4 rounded-2xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-rose-100 rounded-xl group-hover:scale-105 transition-transform">🚨</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Alertas de Stock (HU05)</div>
              <p class="text-xs text-slate-500 mt-0.5">Semáforo de reposición oportuna de insumos críticos.</p>
            </div>
          </a>

          <!-- Administración: Usuarios (Solo Admin) -->
          <a
            *ngIf="authService.isAdmin()"
            routerLink="/admin/usuarios"
            class="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-purple-100 rounded-xl group-hover:scale-105 transition-transform">👥</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Gestión de Usuarios</div>
              <p class="text-xs text-slate-500 mt-0.5">Administración de cuentas, roles RBAC y restablecimiento de claves.</p>
            </div>
          </a>

          <!-- Administración: Catálogos (Solo Admin) -->
          <a
            *ngIf="authService.isAdmin()"
            routerLink="/admin/catalogos"
            class="p-4 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 transition-all flex items-start gap-3 group">
            <span class="text-2xl p-2 bg-purple-100 rounded-xl group-hover:scale-105 transition-transform">📑</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">Catálogos Maestros</div>
              <p class="text-xs text-slate-500 mt-0.5">Mantenedores de estructuras de naves y variedades agrícolas.</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
  readonly erpService = inject(ErpDataService);

  readonly totalSuperficieM2 = computed(() =>
    this.erpService.naves().reduce((acc, n) => acc + n.superficie_m2, 0)
  );
}
