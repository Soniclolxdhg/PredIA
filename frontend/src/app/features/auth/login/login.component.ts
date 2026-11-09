import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RolUsuario } from '../../../core/models/enum.types';

/**
 * Componente de Inicio de Sesión de PredIA.
 * Gestiona el formulario de credenciales (correo y contraseña),
 * la conexión con el servidor API (Render o Localhost) y el inicio de sesión rápido por roles.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Formulario reactivo con validaciones de email y longitud mínima de contraseña
  readonly loginForm: FormGroup = this.fb.group({
    email: ['admin@predia.cl', [Validators.required, Validators.email]],
    password: ['AdminPredIA2026!', [Validators.required, Validators.minLength(6)]]
  });

  // Señales reactivas para el estado de la vista
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | string[] | null>(null);
  readonly mostrarPassword = signal(false);

  // Direcciones base configurables para el backend
  readonly urlRender = 'https://predia-backend.onrender.com/api';
  readonly urlLocal = 'http://localhost:3000/api';

  // Lista de perfiles disponibles para pruebas directas en el sistema
  readonly rolesDemo: { rol: RolUsuario; icono: string; label: string; desc: string; color: string }[] = [
    { rol: 'ADMINISTRADOR', icono: '👑', label: 'Administrador', desc: 'Acceso Total al Sistema', color: 'border-purple-300 hover:bg-purple-50 text-purple-900' },
    { rol: 'AGRONOMO', icono: '🌱', label: 'Agrónomo', desc: 'Producción, Labores y Clima', color: 'border-emerald-300 hover:bg-emerald-50 text-emerald-900' },
    { rol: 'BODEGUERO', icono: '📦', label: 'Bodeguero', desc: 'Insumos, Kardex y Mermas', color: 'border-amber-300 hover:bg-amber-50 text-amber-900' },
    { rol: 'GERENTE', icono: '📊', label: 'Gerente General', desc: 'Dashboard $/Kg y Ventas', color: 'border-blue-300 hover:bg-blue-50 text-blue-900' }
  ];

  /**
   * Determina si el valor recibido corresponde a un arreglo
   */
  esArray(val: unknown): boolean {
    return Array.isArray(val);
  }

  /**
   * Normaliza los mensajes de error retornados por la API en un arreglo de cadenas
   */
  obtenerListaErrores(val: string | string[] | null): string[] {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }

  /**
   * Conmuta la visibilidad del campo de texto de contraseña entre oculto y visible
   */
  alternarMostrarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  /**
   * Cambia la URL base del servicio de autenticación entre el servidor local y el remoto en la nube
   */
  cambiarEntornoApi(url: string): void {
    this.authService.setBaseUrl(url);
  }

  /**
   * Inicia sesión directa con el perfil seleccionado para pruebas del sistema
   */
  ingresarConRolDemo(rol: RolUsuario): void {
    this.authService.switchDemoRole(rol);
  }

  /**
   * Envía las credenciales ingresadas al endpoint /auth/login del backend
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.cargando.set(false);
        // Redirige al mantenedor si es admin o a los ciclos de producción para el resto de roles
        const defaultUrl = this.authService.isAdmin() ? '/admin/usuarios' : '/produccion/ciclos';
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || defaultUrl;
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.cargando.set(false);
        if (err.error?.message) {
          this.mensajeError.set(err.error.message);
        } else if (err.status === 401) {
          this.mensajeError.set('Credenciales inválidas o cuenta desactivada.');
        } else if (err.status === 0) {
          this.mensajeError.set(
            'No fue posible comunicarse con el backend en Render (posible suspensión por inactividad). Puedes usar los botones de acceso directo o verificar tu conexión.'
          );
        } else {
          this.mensajeError.set('Ocurrió un error inesperado al intentar autenticar.');
        }
      }
    });
  }

  /**
   * Comprueba si el control de email ha sido modificado y contiene errores de formato
   */
  get emailInvalido(): boolean {
    const control = this.loginForm.get('email');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Comprueba si el control de contraseña no cumple con los requisitos mínimos
   */
  get passwordInvalido(): boolean {
    const control = this.loginForm.get('password');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
