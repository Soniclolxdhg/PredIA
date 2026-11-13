import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { RolUsuario, Usuario } from '../../core/models/auth.models';
import { ActualizarUsuarioDto } from '../../core/models/dtos/actualizar-usuario.dto';
import { rutChilenoValidator, formatearRutChileno } from '../../core/validators/rut.validator';

/**
 * Componente del Mantenedor de Usuarios del Sistema.
 * Permite al Administrador gestionar las cuentas de usuario, asignar roles RBAC,
 * editar datos, actualizar contraseñas y habilitar o inhabilitar accesos,
 * sincronizado exclusivamente con el backend NestJS y Supabase PostgreSQL.
 *
 * Cumple estrictamente con las reglas de QA:
 * - No simula persistencia si el backend responde con error o 404.
 * - Formularios inician con contraseñas vacías (sin valores por defecto).
 * - Cierre accesible con tecla Escape y retroalimentación honesta.
 */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html'
})
export class UsuariosComponent implements OnInit {
  // Inyección de servicios centrales
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Señales reactivas para mensajes de retroalimentación
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  // Estados de carga de operaciones
  readonly guardandoUsuario = signal<boolean>(false);
  readonly guardandoEdicion = signal<boolean>(false);
  readonly guardandoPassword = signal<boolean>(false);
  readonly actualizandoEstado = signal<number | null>(null);

  // Señales de filtros y búsqueda
  readonly busqueda = signal<string>('');
  readonly filtroRol = signal<string>('TODOS');
  readonly filtroEstado = signal<string>('TODOS');
  readonly mostrarInactivos = signal<boolean>(false);

  // Control de apertura y cierre de ventanas modales
  readonly modalCrearAbierto = signal(false);
  readonly modalEditarAbierto = signal(false);
  readonly modalPasswordAbierto = signal(false);
  readonly usuarioSeleccionado = signal<Usuario | null>(null);

  // Formulario reactivo para la creación de usuario (sin password prellenada)
  readonly crearUsuarioForm: FormGroup = this.fb.group({
    nombre_completo: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]
    ],
    rut: ['', [Validators.required, rutChilenoValidator]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['AGRONOMO' as RolUsuario, [Validators.required]]
  });

  // Formulario reactivo para la edición de usuario existente
  readonly editarUsuarioForm: FormGroup = this.fb.group({
    nombre_completo: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      ]
    ],
    email: ['', [Validators.required, Validators.email]],
    rol: ['AGRONOMO' as RolUsuario, [Validators.required]],
    activo: [true, [Validators.required]]
  });

  // Formulario reactivo para la actualización y confirmación de contraseña
  readonly passwordForm: FormGroup = this.fb.group({
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmarPassword: ['', [Validators.required]]
  });

  // Lista filtrada reactivamente
  readonly usuariosFiltrados = computed(() => {
    const todos = this.authService.usuarios();
    const q = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRol();
    const estado = this.filtroEstado();
    const verInactivos = this.mostrarInactivos();

    return todos.filter((u) => {
      const coincideTexto =
        !q ||
        u.nombre_completo.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.rut.toLowerCase().includes(q);

      const coincideRol = rol === 'TODOS' || u.rol === rol;

      let coincideEstado = true;
      if (estado === 'ACTIVO') {
        coincideEstado = u.activo;
      } else if (estado === 'INACTIVO') {
        coincideEstado = !u.activo;
      } else {
        coincideEstado = verInactivos ? true : u.activo;
      }

      return coincideTexto && coincideRol && coincideEstado;
    });
  });

  /**
   * Listener global de tecla Escape para accesibilidad en ventanas modales
   */
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.modalCrearAbierto()) this.cerrarModalCrear();
    if (this.modalEditarAbierto()) this.cerrarModalEditar();
    if (this.modalPasswordAbierto()) this.cerrarModalPassword();
  }

  ngOnInit(): void {
    this.sincronizarUsuarios();
  }

  /**
   * Refresca la lista de usuarios consultando la base de datos de Supabase vía NestJS
   */
  sincronizarUsuarios(): void {
    this.authService.cargarUsuarios().subscribe();
  }

  /**
   * Aplica formateo visual automático al RUT chileno al desenfocar el campo
   */
  onRutBlur(): void {
    const control = this.crearUsuarioForm.get('rut');
    if (control && control.value) {
      const formateado = formatearRutChileno(control.value);
      control.setValue(formateado, { emitEvent: true });
    }
  }

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
      case 'TRABAJADOR':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  // --- MODAL CREACIÓN ---

  abrirModalCrear(): void {
    this.crearUsuarioForm.reset({
      nombre_completo: '',
      rut: '',
      email: '',
      password: '',
      rol: 'AGRONOMO'
    });
    this.mensajeError.set(null);
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  onSubmitCrearUsuario(): void {
    if (this.crearUsuarioForm.invalid) {
      this.crearUsuarioForm.markAllAsTouched();
      return;
    }

    const raw = this.crearUsuarioForm.value;
    const rolBackend = raw.rol === 'TRABAJADOR' ? 'AGRONOMO' : raw.rol;
    const payload = {
      nombre_completo: raw.nombre_completo,
      rut: raw.rut,
      email: raw.email,
      password: raw.password,
      rol: rolBackend
    };
    console.log('📤 [POST Guardar Usuario] Enviando datos a la API:', {
      nombre_completo: payload.nombre_completo,
      rut: payload.rut,
      email: payload.email,
      rol: payload.rol
    });

    this.guardandoUsuario.set(true);
    this.mensajeError.set(null);

    this.authService.crearUsuario(payload).subscribe({
      next: (res) => {
        this.guardandoUsuario.set(false);
        console.log('📥 [POST Guardar Usuario] Respuesta del servidor:', res);

        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
          this.mensajeError.set(null);
          this.cerrarModalCrear();
          this.sincronizarUsuarios();
        } else {
          // Si el backend responde 409 Conflict o error, se muestra el mensaje y el modal permanece abierto
          this.mensajeError.set(res.mensaje);
        }
      },
      error: (err) => {
        this.guardandoUsuario.set(false);
        console.error('❌ [POST Guardar Usuario] Error de comunicación:', err);
        this.mensajeError.set('Error inesperado de comunicación con el servidor.');
      }
    });
  }

  // --- MODAL EDICIÓN ---

  abrirModalEditar(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.editarUsuarioForm.reset({
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo
    });
    this.mensajeError.set(null);
    this.modalEditarAbierto.set(true);
  }

  cerrarModalEditar(): void {
    this.modalEditarAbierto.set(false);
    this.usuarioSeleccionado.set(null);
  }

  onSubmitEditarUsuario(): void {
    const user = this.usuarioSeleccionado();
    if (!user || this.editarUsuarioForm.invalid) {
      this.editarUsuarioForm.markAllAsTouched();
      return;
    }

    const formVal = this.editarUsuarioForm.value;
    const rolBackend = formVal.rol === 'TRABAJADOR' ? 'AGRONOMO' : formVal.rol;
    const dto: ActualizarUsuarioDto = {
      nombreCompleto: formVal.nombre_completo.trim(),
      email: formVal.email.trim().toLowerCase(),
      rol: rolBackend,
      activo: Boolean(formVal.activo)
    };

    console.log('📤 [PATCH Editar Usuario] Solicitando actualización para:', { id: user.id_usuario, dto });
    this.guardandoEdicion.set(true);
    this.mensajeError.set(null);

    this.authService.actualizarUsuario(user.id_usuario, dto).subscribe({
      next: (res) => {
        this.guardandoEdicion.set(false);
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalEditar();
          this.sincronizarUsuarios();
        } else {
          this.mensajeError.set(res.mensaje);
        }
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        console.error('❌ [PATCH Editar Usuario] Error:', err);
        this.mensajeError.set('Error al comunicarse con el servidor.');
      }
    });
  }

  // --- MODAL PASSWORD ---

  abrirModalPassword(usuario: Usuario): void {
    this.usuarioSeleccionado.set(usuario);
    this.passwordForm.reset({
      nuevaPassword: '',
      confirmarPassword: ''
    });
    this.mensajeError.set(null);
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

    const nueva = this.passwordForm.get('nuevaPassword')?.value;
    console.log('📤 [PATCH Cambiar Clave] Solicitando cambio para:', {
      id_usuario: user.id_usuario,
      email: user.email
    });

    this.guardandoPassword.set(true);
    this.mensajeError.set(null);

    this.authService.cambiarPassword(user.id_usuario, nueva).subscribe({
      next: (res) => {
        this.guardandoPassword.set(false);
        console.log('📥 [PATCH Cambiar Clave] Resultado:', res);

        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalPassword();
        } else {
          this.mensajeError.set(res.mensaje);
        }
      },
      error: (err) => {
        this.guardandoPassword.set(false);
        console.error('❌ [PATCH Cambiar Clave] Error:', err);
        this.mensajeError.set('Error de comunicación con el servidor.');
      }
    });
  }

  // --- ALTERNAR ESTADO ---

  alternarEstado(usuario: Usuario): void {
    const nuevoEstado = !usuario.activo;
    console.log('📤 [PATCH Conmutar Estado Usuario] Usuario:', { id_usuario: usuario.id_usuario, activo: nuevoEstado });

    this.actualizandoEstado.set(usuario.id_usuario);
    this.mensajeError.set(null);

    this.authService.conmutarEstadoUsuario(usuario.id_usuario, nuevoEstado).subscribe({
      next: (res) => {
        this.actualizandoEstado.set(null);
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
          this.sincronizarUsuarios();
        } else {
          this.mensajeError.set(res.mensaje);
        }
      },
      error: (err) => {
        this.actualizandoEstado.set(null);
        console.error('❌ [PATCH Conmutar Estado] Error:', err);
        this.mensajeError.set('Error de comunicación con el servidor al alternar estado.');
      }
    });
  }
}
