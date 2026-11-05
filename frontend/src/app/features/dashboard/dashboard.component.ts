import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);

  readonly perfilData = signal<any>(null);
  readonly perfilCargando = signal(false);
  readonly perfilError = signal<string | null>(null);
  readonly tokenCopiado = signal(false);

  ngOnInit(): void {
    // Al entrar al panel, validamos automáticamente el token contra /auth/perfil
    this.probarEndpointPerfil();
  }

  probarEndpointPerfil(): void {
    this.perfilCargando.set(true);
    this.perfilError.set(null);

    this.authService.obtenerPerfil().subscribe({
      next: (data) => {
        this.perfilData.set(data);
        this.perfilCargando.set(false);
      },
      error: (err) => {
        this.perfilCargando.set(false);
        if (err.status === 401) {
          this.perfilError.set('Error 401 Unauthorized: El token ha expirado o es inválido.');
        } else {
          this.perfilError.set(
            `Error ${err.status}: ${err.error?.message || 'No se pudo obtener el perfil.'}`
          );
        }
      }
    });
  }

  copiarToken(): void {
    const token = this.authService.getToken();
    if (!token) return;

    navigator.clipboard.writeText(token).then(() => {
      this.tokenCopiado.set(true);
      setTimeout(() => this.tokenCopiado.set(false), 2000);
    });
  }

  logout(): void {
    this.authService.logout();
  }

  getObjetoJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}

