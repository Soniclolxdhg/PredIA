import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ErpDataService } from '../core/services/erp-data.service';

/**
 * Componente del Menú Lateral de Navegación (Sidebar).
 * Presenta las opciones del sistema condicionadas por los permisos RBAC del usuario autenticado,
 * incluyendo las secciones activas de Administración, Producción de Terreno y Bodega/Insumos (Fase 3).
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly erpService = inject(ErpDataService);
  @Output() closeSidebar = new EventEmitter<void>();
}
