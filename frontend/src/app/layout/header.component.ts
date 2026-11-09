import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { RolUsuario } from '../core/models/enum.types';

/**
 * Componente del Encabezado Principal (Header).
 * Muestra el título de la empresa, el selector rápido de rol de acceso,
 * la información del usuario con sesión activa y la opción para cerrar sesión.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <!-- Botón para menú en móviles y título de la finca -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="toggleSidebar.emit()"
          class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 touch-target focus:outline-none"
          aria-label="Abrir menú">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <div class="hidden sm:flex flex-col">
          <h1 class="text-sm font-semibold text-slate-800 leading-tight">Santa Laura Ltda. &bull; Invernaderos</h1>
          <span class="text-xs text-slate-500">Gestión Agrícola Predictiva & Monolito Modular</span>
        </div>
      </div>

      <!-- Selector de rol activo y datos del usuario -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Selector rápido de rol para alternar perfiles -->
        <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span class="text-[11px] font-bold text-slate-500 px-2 hidden md:inline">ROL ACTIVO:</span>
          <button
            type="button"
            *ngFor="let rol of roles"
            (click)="authService.switchDemoRole(rol)"
            [class]="authService.userRole() === rol ? getBotonRolActivo(rol) : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 touch-target flex items-center gap-1">
            <span>{{ getIconoRol(rol) }}</span>
            <span class="hidden sm:inline">{{ rol | titlecase }}</span>
          </button>
        </div>

        <!-- Usuario activo, rol y botón de logout -->
        <div class="flex items-center gap-3 border-l border-slate-200 pl-3">
          <div class="text-right hidden sm:block">
            <div class="text-xs font-bold text-slate-800">{{ authService.currentUser()?.nombre_completo }}</div>
            <div class="text-[10px] text-slate-500">{{ authService.currentUser()?.email }}</div>
          </div>

          <span
            [class]="getBadgeClase(authService.userRole())"
            class="px-2.5 py-1 text-xs font-bold rounded-full border shadow-xs tracking-wide">
            {{ authService.userRole() }}
          </span>

          <button
            type="button"
            (click)="authService.logout()"
            class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors touch-target"
            title="Cerrar Sesión">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  @Output() toggleSidebar = new EventEmitter<void>();

  // Lista de perfiles disponibles para alternar
  readonly roles: RolUsuario[] = ['ADMINISTRADOR', 'AGRONOMO', 'BODEGUERO', 'GERENTE'];

  /**
   * Retorna el emoji asociado a cada perfil de usuario
   */
  getIconoRol(rol: RolUsuario): string {
    switch (rol) {
      case 'ADMINISTRADOR': return '👑';
      case 'AGRONOMO': return '🌱';
      case 'BODEGUERO': return '📦';
      case 'GERENTE': return '📊';
    }
  }

  /**
   * Retorna las clases de Tailwind cuando un botón de rol está seleccionado
   */
  getBotonRolActivo(rol: RolUsuario): string {
    switch (rol) {
      case 'ADMINISTRADOR': return 'bg-purple-600 text-white shadow-xs font-bold';
      case 'AGRONOMO': return 'bg-emerald-600 text-white shadow-xs font-bold';
      case 'BODEGUERO': return 'bg-amber-600 text-white shadow-xs font-bold';
      case 'GERENTE': return 'bg-blue-600 text-white shadow-xs font-bold';
    }
  }

  /**
   * Retorna la combinación de clases de Tailwind para la insignia del rol del usuario
   */
  getBadgeClase(rol: RolUsuario | null): string {
    switch (rol) {
      case 'ADMINISTRADOR': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AGRONOMO': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'BODEGUERO': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'GERENTE': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }
}
