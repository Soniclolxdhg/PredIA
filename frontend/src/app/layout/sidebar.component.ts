import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/**
 * Componente del Menú Lateral de Navegación (Sidebar).
 * Presenta las opciones del sistema condicionadas por los permisos RBAC del usuario autenticado,
 * incluyendo las secciones de Administración, Producción y el cronograma de fases.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 select-none">
      <!-- Logotipo y nombre de la empresa -->
      <div class="p-4 flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-md font-bold text-lg">
            🌾
          </div>
          <div>
            <div class="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>PredIA</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">Sistema</span>
            </div>
            <div class="text-[10px] text-slate-400 font-medium">Santa Laura Ltda. • Fase 2</div>
          </div>
        </div>

        <button
          type="button"
          (click)="closeSidebar.emit()"
          class="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Cerrar menú">
          ✕
        </button>
      </div>

      <!-- Menú dinámico según permisos de usuario -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-5">
        <!-- Opciones de administración (exclusivo para rol ADMINISTRADOR) -->
        <div *ngIf="authService.isAdmin()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-purple-400 px-3 mb-1.5 flex items-center justify-between">
            <span>Administración</span>
            <span class="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">Solo Admin</span>
          </div>
          <a
            routerLink="/admin/usuarios"
            routerLinkActive="bg-purple-700 text-white shadow-sm"
            (click)="closeSidebar.emit()"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <span class="flex items-center gap-2.5">
              <span class="text-base">👥</span>
              <span>Usuarios & Claves</span>
            </span>
            <span class="text-[10px] bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded font-mono font-bold">
              {{ authService.usuarios().length }}
            </span>
          </a>
        </div>

        <!-- Módulo de Producción y Terreno (Fase 2 activa) -->
        <div *ngIf="authService.canAccessProduction()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-3 mb-1.5 flex items-center justify-between">
            <span>Producción & Terreno</span>
            <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Fase 2 Activa</span>
          </div>
          <div class="space-y-1">
            <a
              routerLink="/produccion/ciclos"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">🏡</span>
              <span>Ciclos & Naves (HU01)</span>
            </a>
            <a
              routerLink="/produccion/checklist"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="flex items-center gap-2.5">
                <span class="text-base">📋</span>
                <span>Checklist Naves (Tablet)</span>
              </span>
              <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">Terreno</span>
            </a>
            <a
              routerLink="/produccion/labores"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">🚜</span>
              <span>Labores en Terreno (HU02)</span>
            </a>
            <a
              routerLink="/produccion/cosechas"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">🧺</span>
              <span>Pesaje de Cosecha (HU03)</span>
            </a>
          </div>
        </div>

        <!-- Módulos planificados en el cronograma de entregas -->
        <div class="pt-2 border-t border-slate-800/80">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2 flex items-center justify-between">
            <span>Módulos en Cronograma</span>
            <span class="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">Plan</span>
          </div>

          <div class="space-y-1 text-xs">
            <div class="flex items-center justify-between px-3 py-2 text-slate-400 rounded-xl bg-slate-800/40">
              <span class="flex items-center gap-2">
                <span>📦</span>
                <span>Bodega & Kardex</span>
              </span>
              <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Fase 3</span>
            </div>

            <div class="flex items-center justify-between px-3 py-2 text-slate-400 rounded-xl bg-slate-800/40">
              <span class="flex items-center gap-2">
                <span>👷</span>
                <span>Costos & Jornales</span>
              </span>
              <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Fase 4</span>
            </div>

            <div class="flex items-center justify-between px-3 py-2 text-slate-400 rounded-xl bg-slate-800/40">
              <span class="flex items-center gap-2">
                <span>🛒</span>
                <span>Clientes & Ventas</span>
              </span>
              <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Fase 5</span>
            </div>

            <div class="flex items-center justify-between px-3 py-2 text-slate-400 rounded-xl bg-slate-800/40">
              <span class="flex items-center gap-2">
                <span>📊</span>
                <span>Dashboard & Clima</span>
              </span>
              <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">Fase 6</span>
            </div>
          </div>
        </div>
      </nav>

      <!-- Pie de página del menú con identificación institucional -->
      <div class="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        <span>Proyecto de Integración • INACAP 2026</span>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  @Output() closeSidebar = new EventEmitter<void>();
}
