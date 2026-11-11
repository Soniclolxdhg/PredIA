import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RolUsuario, Usuario } from '../../core/models/auth.models';

/**
 * Componente del Mantenedor de Usuarios del Sistema.
 * Permite al Administrador gestionar las cuentas de usuario, asignar roles RBAC,
 * actualizar o restablecer contraseñas y habilitar o inhabilitar accesos.
 */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html'
})
export class UsuariosComponent {
  // Inyección de servicios centrales
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Señales reactivas para mensajes de retroalimentación al usuario
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  // Señales para el control de apertura y cierre de ventanas modales
  readonly modalCrearAbierto = signal(false);
  readonly modalPasswordAbierto = signal(false);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);

  // Formulario reactivo para la creación de un nuevo usuario
  readonly crearUsuarioForm: FormGroup = this.fb.group({
    nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
    rut: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['PredIA2026!', [Validators.required, Validators.minLength(6)]],
    rol: ['AGRONOMO' as RolUsuario, [Validators.required]]
  });

  // Formulario reactivo para la actualización y confirmación de contraseña
  readonly passwordForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  /**
   * Cuenta la cantidad de usuarios que tienen el flag 'activo' en verdadero
   */
  totalActivos(): number {
    return this.authService.usuarios().filter((u) => u.activo).length;
  }

  /**
   * Retorna el número de usuarios asociados a un rol específico
   */
  totalPorRol(rol: RolUsuario): number {
    return this.authService.usuarios().filter((u) => u.rol === rol).length;
  }

  /**
   * Genera el monograma de dos iniciales (ej: 'RV') para el avatar visual del colaborador
   */
  getIniciales(nombre: string): string {
    if (!nombre) return 'U';
    const partes = nombre.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  /**
   * Devuelve las clases CSS de Tailwind correspondientes a la insignia visual de cada rol
   */
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

  /**
   * Abre la ventana modal para crear un nuevo usuario y resetea los campos a sus valores iniciales
   */
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

  /**
   * Cierra la ventana modal de creación de usuario
   */
  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  /**
   * Valida y procesa el envío del formulario para dar de alta al nuevo usuario
   */
  onSubmitCrearUsuario(): void {
    if (this.crearUsuarioForm.invalid) return;

    const payload = this.crearUsuarioForm.value;
    console.log('📤 [POST Botón Guardar Usuario] Enviando datos de usuario:', {
      nombre_completo: payload.nombre_completo,
      rut: payload.rut,
      email: payload.email,
      rol: payload.rol
    });

    const res = this.authService.crearUsuario(payload);
    console.log('📥 [POST Guardar Usuario] Resultado:', res);

    if (res.exito) {
      this.mensajeExito.set(res.mensaje);
      this.mensajeError.set(null);
      this.cerrarModalCrear();
    } else {
      this.mensajeError.set(res.mensaje);
    }
  }

  /**
   * Abre la ventana modal para modificar la contraseña del usuario recibido por parámetro
   */
  abrirModalPassword(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.passwordForm.reset({
      nuevaPassword: '',
      confirmarPassword: ''
    });
    this.modalPasswordAbierto.set(true);
  }

  /**
   * Cierra la ventana modal de cambio de contraseña
   */
  cerrarModalPassword(): void {
    this.usuarioSeleccionado.set(null);
    this.modalPasswordAbierto.set(false);
  }

  /**
   * Verifica si la nueva contraseña y su campo de confirmación son diferentes
   */
  passwordMismatch(): boolean {
    const p1 = this.passwordForm.get('nuevaPassword')?.value;
    const p2 = this.passwordForm.get('confirmarPassword')?.value;
    return !!p1 && !!p2 && p1 !== p2;
  }

  /**
   * Procesa la actualización de la contraseña en el servicio AuthService
   */
  onSubmitPassword(): void {
    const user = this.usuarioSeleccionado();
    if (!user || this.passwordForm.invalid || this.passwordMismatch()) return;

    const nueva = this.passwordForm.get('nuevaPassword')?.value;
    console.log('📤 [POST Botón Actualizar Clave] Cambiando contraseña para:', {
      id_usuario: user.id_usuario,
      email: user.email
    });

    const res = this.authService.cambiarPassword(user.id_usuario, nueva);
    console.log('📥 [POST Actualizar Clave] Resultado:', res);

    if (res.exito) {
      this.mensajeExito.set(res.mensaje);
      this.cerrarModalPassword();
    } else {
      this.mensajeError.set(res.mensaje);
    }
  }

  /**
   * Alterna el estado activo/inactivo del usuario seleccionado
   */
  alternarEstado(usuario: Usuario): void {
    console.log('📤 [POST Conmutar Estado Usuario] Usuario:', { id_usuario: usuario.id_usuario, activo: !usuario.activo });
    this.authService.conmutarEstadoUsuario(usuario.id_usuario);
    const estadoTxt = !usuario.activo ? 'activada' : 'desactivada';
    this.mensajeExito.set(`Cuenta de ${usuario.nombre_completo} ha sido ${estadoTxt}.`);
  }
}
