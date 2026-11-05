import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      <!-- Sidebar Desktop -->
      <div class="hidden lg:flex lg:flex-shrink-0">
        <app-sidebar></app-sidebar>
      </div>

      <!-- Sidebar Móvil (Drawer con Overlay) -->
      <div
        *ngIf="sidebarAbierta()"
        class="fixed inset-0 z-40 lg:hidden flex">
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          (click)="cerrarSidebar()"></div>

        <!-- Contenedor del Drawer -->
        <div class="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-50">
          <app-sidebar (closeSidebar)="cerrarSidebar()"></app-sidebar>
        </div>
      </div>

      <!-- Contenedor Principal (Header + Vistas) -->
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
  readonly sidebarAbierta = signal(false);

  alternarSidebar(): void {
    this.sidebarAbierta.update((v) => !v);
  }

  cerrarSidebar(): void {
    this.sidebarAbierta.set(false);
  }
}
