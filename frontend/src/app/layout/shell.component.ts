import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

/**
 * Componente Contenedor Principal (Shell Layout).
 * Estructura la plantilla general de la aplicación con la barra lateral de navegación (Sidebar),
 * la cabecera superior (Header) y el área de contenido dinámico (RouterOutlet).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      <!-- Menú lateral para pantallas de escritorio -->
      <div class="hidden lg:flex lg:flex-shrink-0">
        <app-sidebar></app-sidebar>
      </div>

      <!-- Menú lateral desplegable para pantallas móviles y tablets -->
      <div
        *ngIf="sidebarAbierta()"
        class="fixed inset-0 z-40 lg:hidden flex">
        <!-- Fondo oscuro con efecto translúcido para cerrar al hacer clic fuera -->
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          (click)="cerrarSidebar()"></div>

        <!-- Contenedor del menú desplegable -->
        <div class="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-50">
          <app-sidebar (closeSidebar)="cerrarSidebar()"></app-sidebar>
        </div>
      </div>

      <!-- Área central de la aplicación -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <app-header (toggleSidebar)="alternarSidebar()"></app-header>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class ShellComponent {
  // Señal reactiva que controla la visibilidad del menú en dispositivos móviles
  readonly sidebarAbierta = signal(false);

  /**
   * Conmuta la visibilidad del menú lateral móvil
   */
  alternarSidebar(): void {
    this.sidebarAbierta.update((v) => !v);
  }

  /**
   * Cierra el menú lateral móvil
   */
  cerrarSidebar(): void {
    this.sidebarAbierta.set(false);
  }
}
