import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideMail,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideCloud,
  LucideLaptop,
  LucideSprout,
  LucideAlertCircle
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Componente de Inicio de Sesión de PredIA.
 * Gestiona el formulario de credenciales (correo y contraseña)
 * y la conexión con el servidor API (Render o Localhost).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideMail,
    LucideLock,
    LucideEye,
    LucideEyeOff,
    LucideSprout,
    LucideAlertCircle
  ],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Formulario reactivo con campos vacíos por defecto
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Señales reactivas para el estado de la vista
  readonly cargando = signal(false);
  readonly mensajeError = signal<string | string[] | null>(null);
  readonly mostrarPassword = signal(false);

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
            'No fue posible comunicarse con el backend en Render. Verifica tu conexión o utiliza el servidor local si está activo.'
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
