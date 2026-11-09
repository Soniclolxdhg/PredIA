import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas privadas que requieren una sesión autenticada activa.
 * Si el usuario no ha iniciado sesión, lo redirige al login guardando la URL solicitada.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

/**
 * Guard para rutas de invitados (login).
 * Evita que usuarios con sesión activa vuelvan a ingresar al formulario de login.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const destino = authService.isAdmin() ? '/admin/usuarios' : '/produccion/ciclos';
    return router.createUrlTree([destino]);
  }

  return true;
};
