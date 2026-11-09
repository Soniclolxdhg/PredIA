import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../models/enum.types';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = route.data?.['roles'] as RolUsuario[] | undefined;
  const userRole = authService.userRole();

  if (!userRole) {
    return router.createUrlTree(['/login']);
  }

  // Administrador tiene acceso irrestricto
  if (userRole === 'ADMINISTRADOR') {
    return true;
  }

  if (rolesPermitidos && rolesPermitidos.includes(userRole)) {
    return true;
  }

  // Si no tiene permiso para la ruta actual (ej: no-admin entrando a /admin/usuarios):
  return router.createUrlTree(['/produccion/ciclos']);
};
