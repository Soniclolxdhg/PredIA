import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './layout/shell.component';

/**
 * Definición central de rutas del sistema (Angular Standalone Router).
 * Estructura:
 * - /login: Ruta pública para inicio de sesión, protegida con guestGuard.
 * - ShellComponent: Contenedor protegido por authGuard que encapsula los módulos autenticados.
 * - Rutas hijas: Protegidas individualmente por roleGuard según la matriz RBAC.
 */
export const routes: Routes = [
  // Ruta pública de autenticación
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard]
  },

  // Rutas internas del sistema bajo la plantilla Shell
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      // Mantenedor de usuarios exclusivo para Administrador
      {
        path: 'admin/usuarios',
        loadComponent: () =>
          import('./features/admin-usuarios/usuarios.component').then((m) => m.UsuariosComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      },

      // Ciclos de cultivo e invernaderos (HU01)
      {
        path: 'produccion/ciclos',
        loadComponent: () =>
          import('./features/produccion/ciclos-cultivo.component').then((m) => m.CiclosCultivoComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },

      // Checklist de inspección y supervisión física de naves en terreno
      {
        path: 'produccion/checklist',
        loadComponent: () =>
          import('./features/produccion/checklist-naves.component').then((m) => m.ChecklistNavesComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },
      {
        path: 'produccion/simulador',
        redirectTo: 'produccion/checklist',
        pathMatch: 'full'
      },

      // Registro de labores agrícolas en terreno (HU02)
      {
        path: 'produccion/labores',
        loadComponent: () =>
          import('./features/produccion/registro-labores.component').then((m) => m.RegistroLaboresComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
      },

      // Pesaje y recepción de cosecha al pie de nave (HU03)
      {
        path: 'produccion/cosechas',
        loadComponent: () =>
          import('./features/produccion/pesaje-cosecha.component').then((m) => m.PesajeCosechaComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
      },

      // Redirecciones de conveniencia dentro del módulo de producción
      {
        path: 'produccion',
        redirectTo: 'produccion/ciclos',
        pathMatch: 'full'
      },
      {
        path: 'admin',
        redirectTo: 'admin/usuarios',
        pathMatch: 'full'
      },
      {
        path: '',
        redirectTo: 'produccion/ciclos',
        pathMatch: 'full'
      }
    ]
  },

  // Ruta comodín para redirigir URLs desconocidas al login
  {
    path: '**',
    redirectTo: 'login'
  }
];
