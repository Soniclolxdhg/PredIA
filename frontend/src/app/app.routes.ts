import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
      },
      {
        path: 'produccion',
        children: [
          {
            path: 'ciclos',
            loadComponent: () =>
              import('./features/produccion/ciclos-cultivo.component').then((m) => m.CiclosCultivoComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
          },
          {
            path: 'labores',
            loadComponent: () =>
              import('./features/produccion/registro-labores.component').then((m) => m.RegistroLaboresComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
          },
          {
            path: 'cosechas',
            loadComponent: () =>
              import('./features/produccion/pesaje-cosecha.component').then((m) => m.PesajeCosechaComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'AGRONOMO'] }
          },
          {
            path: '',
            redirectTo: 'ciclos',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'bodega',
        children: [
          {
            path: 'kardex',
            loadComponent: () =>
              import('./features/bodega/kardex-inventario.component').then((m) => m.KardexInventarioComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'BODEGUERO'] }
          },
          {
            path: 'alertas',
            loadComponent: () =>
              import('./features/bodega/alertas-stock.component').then((m) => m.AlertasStockComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'BODEGUERO'] }
          },
          {
            path: '',
            redirectTo: 'kardex',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'costos',
        children: [
          {
            path: 'jornales',
            loadComponent: () =>
              import('./features/costos/asistencia-jornales.component').then((m) => m.AsistenciaJornalesComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
          },
          {
            path: 'indirectos',
            loadComponent: () =>
              import('./features/costos/costos-indirectos.component').then((m) => m.CostosIndirectosComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
          },
          {
            path: 'consolidado',
            loadComponent: () =>
              import('./features/costos/consolidado-costo.component').then((m) => m.ConsolidadoCostoComponent),
            canActivate: [roleGuard],
            data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
          },
          {
            path: '',
            redirectTo: 'consolidado',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas.component').then((m) => m.VentasComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE'] }
      },
      {
        path: 'clima',
        loadComponent: () =>
          import('./features/clima/clima.component').then((m) => m.ClimaComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE'] }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
