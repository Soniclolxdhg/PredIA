import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly cargando = signal(false);
  readonly mensajeError = signal<string | string[] | null>(null);
  readonly mostrarPassword = signal(false);

  // URLs disponibles para alternar
  readonly urlRender = 'https://predia-backend.onrender.com/api';
  readonly urlLocal = 'http://localhost:3000/api';

  esArray(val: unknown): boolean {
    return Array.isArray(val);
  }

  obtenerListaErrores(val: string | string[] | null): string[] {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }

  alternarMostrarPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  cargarCredencialesDemo(): void {
    this.loginForm.patchValue({
      email: 'admin@predia.cl',
      password: 'AdminPredIA2026!'
    });
    this.mensajeError.set(null);
  }

  cambiarEntornoApi(url: string): void {
    this.authService.setBaseUrl(url);
  }

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
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
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
            'No fue posible comunicarse con el backend. Verifica tu conexión de red o el servicio en Render.'
          );
        } else {
          this.mensajeError.set('Ocurrió un error inesperado al intentar autenticar.');
        }
      }
    });
  }

  get emailInvalido(): boolean {
    const control = this.loginForm.get('email');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get passwordInvalido(): boolean {
    const control = this.loginForm.get('password');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
