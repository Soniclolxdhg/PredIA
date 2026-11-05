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

  // Si no tiene permiso, lo redirigimos a su vista principal correspondiente
  if (userRole === 'BODEGUERO') {
    return router.createUrlTree(['/bodega/kardex']);
  } else if (userRole === 'AGRONOMO') {
    return router.createUrlTree(['/produccion/ciclos']);
  } else if (userRole === 'GERENTE') {
    return router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree(['/login']);
};

