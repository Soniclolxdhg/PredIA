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
        path: 'admin/usuarios',
        loadComponent: () =>
          import('./features/admin-usuarios/usuarios.component').then((m) => m.UsuariosComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      },
      {
        path: 'produccion/ciclos',
        loadComponent: () =>
          import('./features/produccion/ciclos-cultivo.component').then((m) => m.CiclosCultivoComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
      },
      {
        path: 'produccion/simulador',
        loadComponent: () =>
          import('./features/produccion/simulador-naves.component').then((m) => m.SimuladorNavesComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'AGRONOMO', 'GERENTE', 'BODEGUERO'] }
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
  {
    path: '**',
    redirectTo: 'login'
  }
];
