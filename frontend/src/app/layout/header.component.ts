import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ErpDataService } from '../core/services/erp-data.service';
import { RolUsuario } from '../core/models/enum.types';

/**
 * Componente del Encabezado Principal (Header).
 * Muestra el título de la empresa, el selector rápido de rol de acceso,
 * notificaciones de stock crítico, información de usuario y logout.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  readonly authService = inject(AuthService);
  readonly erpService = inject(ErpDataService);
  @Output() toggleSidebar = new EventEmitter<void>();

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
