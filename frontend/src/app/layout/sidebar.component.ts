import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ErpDataService } from '../core/services/erp-data.service';
import { WeatherService } from '../core/services/weather.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 select-none">
      <!-- Marca y Logo -->
      <div class="p-4 flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-md font-bold text-lg">
            🌾
          </div>
          <div>
            <div class="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>PredIA</span>
              <span class="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">ERP</span>
            </div>
            <div class="text-[10px] text-slate-400 font-medium">Santa Laura Ltda.</div>
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

      <!-- Menú Dinámico con Control de Acceso RBAC -->
      <nav class="flex-1 overflow-y-auto p-3 space-y-6">
        <!-- SECCIÓN: ANÁLISIS DIRECTIVO -->
        <div *ngIf="authService.canAccessExecutive()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
            Gerencia & Analytics
          </div>
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-emerald-600 text-white shadow-sm"
            (click)="closeSidebar.emit()"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <span class="flex items-center gap-2.5">
              <span class="text-base">📊</span>
              <span>Dashboard Ejecutivo</span>
            </span>
            <span class="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">KPIs</span>
          </a>
        </div>

        <!-- SECCIÓN: CAMPO & PRODUCCIÓN -->
        <div *ngIf="authService.canAccessProduction()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
            Producción & Cultivo
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
              <span class="text-base">⚖️</span>
              <span>Pesaje de Cosecha (HU03)</span>
            </a>
          </div>
        </div>

        <!-- SECCIÓN: BODEGA & KARDEX -->
        <div *ngIf="authService.canAccessWarehouse()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center justify-between">
            <span>Bodega & Insumos</span>
            <span
              *ngIf="erpService.insumosCriticos().length > 0"
              class="text-[10px] bg-amber-500 text-slate-950 px-1.5 rounded-full font-bold animate-pulse">
              {{ erpService.insumosCriticos().length }} alerta
            </span>
          </div>
          <div class="space-y-1">
            <a
              routerLink="/bodega/kardex"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">📋</span>
              <span>Kardex & Mermas (HU04)</span>
            </a>
            <a
              routerLink="/bodega/alertas"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="flex items-center gap-2.5">
                <span class="text-base">⚠️</span>
                <span>Stock Crítico (HU05)</span>
              </span>
              <span
                *ngIf="erpService.insumosCriticos().length > 0"
                class="text-[10px] bg-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {{ erpService.insumosCriticos().length }}
              </span>
            </a>
          </div>
        </div>

        <!-- SECCIÓN: COSTOS & MANO DE OBRA -->
        <div *ngIf="authService.canAccessCosting()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
            Costos & Finanzas
          </div>
          <div class="space-y-1">
            <a
              routerLink="/costos/jornales"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">👷</span>
              <span>Jornales & Asistencia (HU06)</span>
            </a>
            <a
              routerLink="/costos/indirectos"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="text-base">💡</span>
              <span>Costos Indirectos (HU07)</span>
            </a>
            <a
              routerLink="/costos/consolidado"
              routerLinkActive="bg-emerald-600 text-white shadow-sm"
              (click)="closeSidebar.emit()"
              class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
              <span class="flex items-center gap-2.5">
                <span class="text-base">💲</span>
                <span>Consolidado $/Kg (HU09)</span>
              </span>
              <span class="text-[10px] text-emerald-400 font-bold font-mono">
                \${{ erpService.kpisFinancieros().costoPromedioKg }}
              </span>
            </a>
          </div>
        </div>

        <!-- SECCIÓN: COMERCIAL & VENTAS -->
        <div *ngIf="authService.canAccessSales()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
            Comercial
          </div>
          <a
            routerLink="/ventas"
            routerLinkActive="bg-emerald-600 text-white shadow-sm"
            (click)="closeSidebar.emit()"
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <span class="text-base">🛒</span>
            <span>Clientes & Ventas (HU08/10)</span>
          </a>
        </div>

        <!-- SECCIÓN: AGROCLIMA -->
        <div *ngIf="authService.canAccessWeather()">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center justify-between">
            <span>Agroclima</span>
            <span
              *ngIf="weatherService.alertaHeladaActiva()"
              class="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
              HELADA &lt;2°C
            </span>
          </div>
          <a
            routerLink="/clima"
            routerLinkActive="bg-emerald-600 text-white shadow-sm"
            (click)="closeSidebar.emit()"
            class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all">
            <span class="flex items-center gap-2.5">
              <span class="text-base">⛅</span>
              <span>Pronóstico & Heladas (HU11)</span>
            </span>
            <span
              *ngIf="weatherService.alertaHeladaActiva()"
              class="text-xs">
              ❄️
            </span>
          </a>
        </div>
      </nav>

      <!-- Pie del Sidebar con Versión e Institución -->
      <div class="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 text-center">
        <span>Proyecto de Integración &bull; INACAP 2026</span>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly erpService = inject(ErpDataService);
  readonly weatherService = inject(WeatherService);
  @Output() closeSidebar = new EventEmitter<void>();
}
