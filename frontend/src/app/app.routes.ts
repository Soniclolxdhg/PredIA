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
      // Dashboard principal
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },

      // ==========================================
      // ADMINISTRACIÓN (Solo Administrador)
      // ==========================================
      {
        path: 'admin/usuarios',
        loadComponent: () =>
          import('./features/admin-usuarios/usuarios.component').then((m) => m.UsuariosComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      },
      {
        path: 'admin/catalogos',
        loadComponent: () =>
          import('./features/admin-catalogos/catalogos.component').then((m) => m.CatalogosComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      },

      // ==========================================
      // MÓDULO PRODUCCIÓN & TERRENO (HU01 - HU03)
      // ==========================================
      {
        path: 'produccion/ciclos',
        loadComponent: () =>
          import('./features/produccion/ciclos-cultivo.component').then((m) => m.CiclosCultivoComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },
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
      {
        path: 'produccion/labores',
        loadComponent: () =>
          import('./features/produccion/registro-labores.component').then((m) => m.RegistroLaboresComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
      },
      {
        path: 'produccion/cosechas',
        loadComponent: () =>
          import('./features/produccion/pesaje-cosecha.component').then((m) => m.PesajeCosechaComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
      },

      // ==========================================
      // MÓDULO BODEGA E INSUMOS (HU04, HU05)
      // ==========================================
      {
        path: 'bodega/kardex',
        loadComponent: () =>
          import('./features/bodega/kardex-inventario.component').then((m) => m.KardexInventarioComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'BODEGUERO', 'AGRONOMO', 'GERENTE'] }
      },
      {
        path: 'bodega/alertas',
        loadComponent: () =>
          import('./features/bodega/alertas-stock.component').then((m) => m.AlertasStockComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'BODEGUERO', 'AGRONOMO', 'GERENTE'] }
      },

      // ==========================================
      // MÓDULO COSTOS & MANO DE OBRA (HU06, HU07, HU09)
      // ==========================================
      {
        path: 'costos/asistencia',
        loadComponent: () =>
          import('./features/costos/asistencia-jornales.component').then((m) => m.AsistenciaJornalesComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE', 'AGRONOMO'] }
      },
      {
        path: 'costos/indirectos',
        loadComponent: () =>
          import('./features/costos/costos-indirectos.component').then((m) => m.CostosIndirectosComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
      },
      {
        path: 'costos/consolidado',
        loadComponent: () =>
          import('./features/costos/consolidado-costo.component').then((m) => m.ConsolidadoCostoComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
      },

      // ==========================================
      // MÓDULO COMERCIAL: VENTAS & CLIENTES (HU08, HU10)
      // ==========================================
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas.component').then((m) => m.VentasComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
      },

      // ==========================================
      // MÓDULO AGROCLIMA & HELADAS (HU11, HU12)
      // ==========================================
      {
        path: 'clima',
        loadComponent: () =>
          import('./features/clima/clima.component').then((m) => m.ClimaComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },

      // Redirecciones de conveniencia
      {
        path: 'produccion',
        redirectTo: 'produccion/ciclos',
        pathMatch: 'full'
      },
      {
        path: 'bodega',
        redirectTo: 'bodega/kardex',
        pathMatch: 'full'
      },
      {
        path: 'costos',
        redirectTo: 'costos/consolidado',
        pathMatch: 'full'
      },
      {
        path: 'admin',
        redirectTo: 'admin/usuarios',
        pathMatch: 'full'
      },
      {
        path: '',
        redirectTo: 'dashboard',
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
