import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolUsuario } from '../models/enum.types';

/**
 * Guard funcional para control de acceso basado en roles (RBAC).
 * Inspecciona los roles permitidos en la propiedad 'data.roles' de la ruta activa:
 * 1. El rol 'ADMINISTRADOR' posee autorización total sobre cualquier módulo.
 * 2. Si el rol del usuario figura en el listado de permitidos, concede el acceso.
 * 3. En caso contrario, redirige al usuario a la vista principal de ciclos de producción.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = route.data?.['roles'] as RolUsuario[] | undefined;
  const userRole = authService.userRole();

  // Si no hay sesión iniciada, se redirige a la pantalla de login
  if (!userRole) {
    return router.createUrlTree(['/login']);
  }

  // El perfil Administrador tiene acceso irrestricto en todo el sistema
  if (userRole === 'ADMINISTRADOR') {
    return true;
  }

  // Verifica si el rol del usuario está dentro de los autorizados para la ruta
  if (rolesPermitidos && rolesPermitidos.includes(userRole)) {
    return true;
  }

  // Si el usuario no tiene permisos para esta ruta, se redirige a la vista de ciclos
  return router.createUrlTree(['/produccion/ciclos']);
};
