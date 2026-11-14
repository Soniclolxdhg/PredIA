import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideSprout,
  LucideLayoutDashboard,
  LucideUsers,
  LucideFolderTree,
  LucideWarehouse,
  LucideClipboardCheck,
  LucideTractor,
  LucideScale,
  LucideBoxes,
  LucideBell,
  LucideUserCheck,
  LucideReceipt,
  LucideBarChart3,
  LucideShoppingCart,
  LucideCloudSun,
  LucideChevronDown,
  LucideChevronRight,
  LucideX
} from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { ErpDataService } from '../core/services/erp-data.service';

/**
 * Componente del Menú Lateral de Navegación (Sidebar).
 * Presenta las opciones del sistema condicionadas por los permisos RBAC del usuario autenticado,
 * con menús desplegables tipo acordeón e iconos vectoriales Lucide limpios.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideSprout,
    LucideLayoutDashboard,
    LucideUsers,
    LucideFolderTree,
    LucideWarehouse,
    LucideClipboardCheck,
    LucideTractor,
    LucideScale,
    LucideBoxes,
    LucideBell,
    LucideUserCheck,
    LucideReceipt,
    LucideBarChart3,
    LucideShoppingCart,
    LucideCloudSun,
    LucideChevronDown,
    LucideChevronRight,
    LucideX
  ],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly erpService = inject(ErpDataService);
  @Output() closeSidebar = new EventEmitter<void>();

  // Estados de acordeón para las secciones del menú
  readonly menuAdminAbierto = signal<boolean>(true);
  readonly menuProduccionAbierto = signal<boolean>(true);
  readonly menuBodegaAbierto = signal<boolean>(true);
  readonly menuCostosAbierto = signal<boolean>(true);
  readonly menuComercialAbierto = signal<boolean>(true);
  readonly menuClimaAbierto = signal<boolean>(true);

  toggleMenuAdmin(): void {
    this.menuAdminAbierto.update(v => !v);
  }

  toggleMenuProduccion(): void {
    this.menuProduccionAbierto.update(v => !v);
  }

  toggleMenuBodega(): void {
    this.menuBodegaAbierto.update(v => !v);
  }

  toggleMenuCostos(): void {
    this.menuCostosAbierto.update(v => !v);
  }

  toggleMenuComercial(): void {
    this.menuComercialAbierto.update(v => !v);
  }

  toggleMenuClima(): void {
    this.menuClimaAbierto.update(v => !v);
  }
}
