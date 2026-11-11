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
  templateUrl: './header.component.html'
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
