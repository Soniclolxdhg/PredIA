import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RolUsuario, Usuario } from '../../core/models/auth.models';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Encabezado del Módulo -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">👥</span>
            <h1 class="text-xl font-bold text-slate-800">Gestión de Usuarios & Control de Accesos</h1>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Mantenedor exclusivo para Administradores: creación de cuentas, asignación de roles RBAC y reseteo de claves.
          </p>
        </div>

        <button
          type="button"
          (click)="abrirModalCrear()"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors touch-target">
          <span>➕</span>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <!-- Alertas de Notificación -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold hover:text-emerald-950">✕</button>
      </div>

      <div *ngIf="mensajeError()" class="p-4 bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">⚠️ {{ mensajeError() }}</span>
        <button (click)="mensajeError.set(null)" class="text-rose-700 font-bold hover:text-rose-950">✕</button>
      </div>

      <!-- Métricas Rápidas de Cuentas -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Usuarios</div>
          <div class="text-2xl font-black text-slate-800 mt-1">{{ authService.usuarios().length }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activos</div>
          <div class="text-2xl font-black text-emerald-600 mt-1">{{ totalActivos() }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Agrónomos / Campo</div>
          <div class="text-2xl font-black text-blue-600 mt-1">{{ totalPorRol('AGRONOMO') }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bodega & Costos</div>
          <div class="text-2xl font-black text-amber-600 mt-1">{{ totalPorRol('BODEGUERO') + totalPorRol('GERENTE') }}</div>
        </div>
      </div>

      <!-- Tabla de Usuarios -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div class="font-bold text-sm text-slate-800">
            Listado Oficial de Cuentas Santa Laura Ltda.
          </div>
          <div class="text-xs text-slate-500">
            Haga clic en una acción para cambiar clave o alternar estado.
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-700">
            <thead class="bg-slate-100 text-xs uppercase text-slate-600 tracking-wider">
              <tr>
                <th class="p-3 sm:p-4">Colaborador</th>
                <th class="p-3 sm:p-4">RUT</th>
                <th class="p-3 sm:p-4">Correo Electrónico</th>
                <th class="p-3 sm:p-4">Rol Asignado</th>
                <th class="p-3 sm:p-4">Estado</th>
                <th class="p-3 sm:p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr *ngFor="let u of authService.usuarios()" class="hover:bg-slate-50 transition-colors">
                <td class="p-3 sm:p-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {{ getIniciales(u.nombre_completo) }}
                    </div>
                    <div>
                      <div class="font-semibold text-slate-900">{{ u.nombre_completo }}</div>
                      <div class="text-[11px] text-slate-400">ID: #{{ u.id_usuario }}</div>
                    </div>
                  </div>
                </td>
                <td class="p-3 sm:p-4 font-mono text-xs text-slate-600">{{ u.rut }}</td>
                <td class="p-3 sm:p-4 text-slate-600">{{ u.email }}</td>
                <td class="p-3 sm:p-4">
                  <span [class]="getClaseBadgeRol(u.rol)" class="text-[11px] font-bold px-2.5 py-1 rounded-full border">
                    {{ u.rol }}
                  </span>
                </td>
                <td class="p-3 sm:p-4">
                  <span
                    [class]="u.activo ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'"
                    class="text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full" [class]="u.activo ? 'bg-emerald-600' : 'bg-slate-500'"></span>
                    {{ u.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="p-3 sm:p-4 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <!-- Botón Restablecer Clave -->
                    <button
                      type="button"
                      (click)="abrirModalPassword(u)"
                      title="Cambiar Contraseña"
                      class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300 touch-target">
                      🔑 Clave
                    </button>

                    <!-- Switch Activar / Desactivar -->
                    <button
                      type="button"
                      (click)="alternarEstado(u)"
                      [title]="u.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'"
                      [class]="u.activo ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'"
                      class="px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border touch-target">
                      {{ u.activo ? 'Desactivar' : 'Habilitar' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: CREAR USUARIO -->
      <div
        *ngIf="modalCrearAbierto()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>👤</span>
              <span>Crear Nuevo Usuario</span>
            </h3>
            <button (click)="cerrarModalCrear()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="crearUsuarioForm" (ngSubmit)="onSubmitCrearUsuario()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                formControlName="nombre_completo"
                placeholder="Ej. Juan Pérez González"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
              <div *ngIf="crearUsuarioForm.get('nombre_completo')?.touched && crearUsuarioForm.get('nombre_completo')?.invalid" class="text-[11px] text-rose-600 mt-1">
                Ingrese el nombre completo (mínimo 3 caracteres).
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  RUT *
                </label>
                <input
                  type="text"
                  formControlName="rut"
                  placeholder="12.345.678-9"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
                <div *ngIf="crearUsuarioForm.get('rut')?.touched && crearUsuarioForm.get('rut')?.invalid" class="text-[11px] text-rose-600 mt-1">
                  RUT requerido.
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Rol del Sistema *
                </label>
                <select
                  formControlName="rol"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none bg-white">
                  <option value="AGRONOMO">AGRÓNOMO (Campo)</option>
                  <option value="BODEGUERO">BODEGUERO (Insumos)</option>
                  <option value="GERENTE">GERENTE (Costos/KPI)</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR (Total)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                formControlName="email"
                placeholder="usuario&#64;predia.cl"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
              <div *ngIf="crearUsuarioForm.get('email')?.touched && crearUsuarioForm.get('email')?.invalid" class="text-[11px] text-rose-600 mt-1">
                Ingrese un email válido.
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Contraseña Inicial *
              </label>
              <input
                type="password"
                formControlName="password"
                placeholder="Mínimo 6 caracteres"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
              <div *ngIf="crearUsuarioForm.get('password')?.touched && crearUsuarioForm.get('password')?.invalid" class="text-[11px] text-rose-600 mt-1">
                Mínimo 6 caracteres.
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModalCrear()"
                class="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="crearUsuarioForm.invalid"
                class="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors">
                Guardar Usuario
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL: CAMBIAR / RESETEAR CONTRASEÑA -->
      <div
        *ngIf="modalPasswordAbierto() && usuarioSeleccionado()"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>🔑</span>
              <span>Cambiar Contraseña</span>
            </h3>
            <button (click)="cerrarModalPassword()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <p class="text-xs text-slate-600 mb-4">
            Actualizar credencial de acceso para:
            <strong class="text-slate-900 block mt-0.5">{{ usuarioSeleccionado()?.nombre_completo }} ({{ usuarioSeleccionado()?.email }})</strong>
          </p>

          <form [formGroup]="passwordForm" (ngSubmit)="onSubmitPassword()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                formControlName="nuevaPassword"
                placeholder="Mínimo 6 caracteres"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
              <div *ngIf="passwordForm.get('nuevaPassword')?.touched && passwordForm.get('nuevaPassword')?.invalid" class="text-[11px] text-rose-600 mt-1">
                La contraseña debe tener al menos 6 caracteres.
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                formControlName="confirmarPassword"
                placeholder="Repita la contraseña"
                class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none" />
              <div *ngIf="passwordMismatch()" class="text-[11px] text-rose-600 mt-1">
                Las contraseñas ingresadas no coinciden.
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModalPassword()"
                class="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="passwordForm.invalid || passwordMismatch()"
                class="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors">
                Actualizar Clave
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class UsuariosComponent {
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  readonly modalCrearAbierto = signal(false);
  readonly modalPasswordAbierto = signal(false);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);

  readonly crearUsuarioForm: FormGroup = this.fb.group({
    nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
    rut: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['PredIA2026!', [Validators.required, Validators.minLength(6)]],
    rol: ['AGRONOMO' as RolUsuario, [Validators.required]]
  });

  readonly passwordForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  totalActivos(): number {
    return this.authService.usuarios().filter((u) => u.activo).length;
  }

  totalPorRol(rol: RolUsuario): number {
    return this.authService.usuarios().filter((u) => u.rol === rol).length;
  }

  getIniciales(nombre: string): string {
    if (!nombre) return 'U';
    const partes = nombre.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  getClaseBadgeRol(rol: RolUsuario): string {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'AGRONOMO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'BODEGUERO':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'GERENTE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  abrirModalCrear(): void {
    this.crearUsuarioForm.reset({
      nombre_completo: '',
      rut: '',
      email: '',
      password: 'PredIA2026!',
      rol: 'AGRONOMO'
    });
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  onSubmitCrearUsuario(): void {
    if (this.crearUsuarioForm.invalid) return;

    const res = this.authService.crearUsuario(this.crearUsuarioForm.value);
    if (res.exito) {
      this.mensajeExito.set(res.mensaje);
      this.mensajeError.set(null);
      this.cerrarModalCrear();
    } else {
      this.mensajeError.set(res.mensaje);
    }
  }

  abrirModalPassword(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.passwordForm.reset({
      nuevaPassword: '',
      confirmarPassword: ''
    });
    this.modalPasswordAbierto.set(true);
  }

  cerrarModalPassword(): void {
    this.usuarioSeleccionado.set(null);
    this.modalPasswordAbierto.set(false);
  }

  passwordMismatch(): boolean {
    const p1 = this.passwordForm.get('nuevaPassword')?.value;
    const p2 = this.passwordForm.get('confirmarPassword')?.value;
    return !!p1 && !!p2 && p1 !== p2;
  }

  onSubmitPassword(): void {
    const user = this.usuarioSeleccionado();
    if (!user || this.passwordForm.invalid || this.passwordMismatch()) return;

    const res = this.authService.cambiarPassword(
      user.id_usuario,
      this.passwordForm.get('nuevaPassword')?.value
    );

    if (res.exito) {
      this.mensajeExito.set(res.mensaje);
      this.cerrarModalPassword();
    } else {
      this.mensajeError.set(res.mensaje);
    }
  }

  alternarEstado(usuario: Usuario): void {
    this.authService.conmutarEstadoUsuario(usuario.id_usuario);
    const estadoTxt = !usuario.activo ? 'activada' : 'desactivada';
    this.mensajeExito.set(`Cuenta de ${usuario.nombre_completo} ha sido ${estadoTxt}.`);
  }
}
