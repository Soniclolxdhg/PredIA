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
  templateUrl: './shell.component.html'
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
