import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolUsuario, Usuario } from '../models/auth.models';
import { AUTH_ENDPOINTS } from '../constants/auth.endpoints';
import { RegistroUsuarioDto, ActualizarUsuarioDto } from '../models/dtos';

// Claves de almacenamiento de sesión de pestaña (SessionStorage)
const TOKEN_KEY = 'predia_tab_token';
const USER_KEY = 'predia_tab_user';

/**
 * Servicio Central de Autenticación y Control de Accesos (RBAC).
 * Gestiona el ciclo de vida de la sesión mediante Angular Signals,
 * el token de autenticación JWT almacenado en sessionStorage (memoria de pestaña)
 * y el listado oficial de usuarios sincronizado con Supabase vía NestJS.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Dirección base oficial del backend (fijada desde el entorno, sin dependencia de LocalStorage)
  readonly baseUrl = signal<string>(environment.apiUrl);

  // Señal con el token de acceso JWT del usuario autenticado (almacenado exclusivamente en sessionStorage)
  readonly token = signal<string | null>(this.recuperarTokenInicial());

  // Señal con la información del colaborador actualmente logueado
  readonly currentUser = signal<Usuario | null>(this.recuperarUsuarioInicial());

  // Señal reactiva con la lista de usuarios administrables (cargada exclusivamente vía API)
  readonly usuarios = signal<Usuario[]>([]);

  // Señal de estado de carga de usuarios
  readonly cargandoUsuarios = signal<boolean>(false);

  // Señales computadas para verificación de estado y rol de acceso
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly userRole = computed<RolUsuario | null>(() => this.currentUser()?.rol ?? null);

  // Señales computadas para control de acceso basado en roles (RBAC)
  readonly isAdmin = computed(() => this.userRole() === 'ADMINISTRADOR');
  readonly isAgronomo = computed(() => this.userRole() === 'AGRONOMO');
  readonly isBodeguero = computed(() => this.userRole() === 'BODEGUERO');
  readonly isGerente = computed(() => this.userRole() === 'GERENTE');

  readonly canAccessProduction = computed(() => this.isAdmin() || this.isAgronomo());
  readonly canAccessWarehouse = computed(() => this.isAdmin() || this.isBodeguero() || this.isAgronomo() || this.isGerente());
  readonly canAccessCosting = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessExecutive = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessSales = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessWeather = computed(() => this.isAdmin() || this.isAgronomo() || this.isGerente());

  constructor() {
    // Purgar de forma estricta cualquier residuo previo en localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('predia_access_token');
        localStorage.removeItem('predia_usuario_sesion');
        localStorage.removeItem('predia_api_base_url');
        localStorage.removeItem('predia_usuarios_lista');
        localStorage.removeItem('predia_usuarios_list');
      } catch {
        // Ignorar excepciones en navegadores con sandbox restringido
      }
    }

    // Si hay token en la pestaña, consulta inmediatamente la lista oficial desde el backend
    if (this.token()) {
      this.cargarUsuarios().subscribe({ error: () => {} });
    }
  }

  private recuperarTokenInicial(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  }

  /**
   * Recupera el usuario guardado en la pestaña o retorna null (sin usuarios mock por defecto)
   */
  private recuperarUsuarioInicial(): Usuario | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return this.normalizarUsuario(parsed);
    } catch {
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  }

  /**
   * Normaliza los campos del objeto de usuario para garantizar compatibilidad de nomenclatura
   */
  private normalizarUsuario(raw: any): Usuario {
    return {
      id_usuario: raw.id_usuario ?? raw.idUsuario ?? 0,
      nombre_completo: raw.nombre_completo ?? raw.nombreCompleto ?? 'Usuario',
      rut: raw.rut ?? '',
      email: raw.email ?? '',
      rol: (raw.rol as RolUsuario) ?? 'AGRONOMO',
      activo: Boolean(raw.activo !== undefined ? raw.activo : true)
    };
  }

  /**
   * Retorna el token JWT activo o null si no hay sesión
   */
  getToken(): string | null {
    return this.token();
  }

  /**
   * Permite actualizar en memoria la dirección base si el entorno lo requiere
   */
  setBaseUrl(url: string): void {
    const sanitized = url.replace(/\/+$/, '');
    this.baseUrl.set(sanitized);
  }

  /**
   * Carga la nómina real de colaboradores desde la base de datos de Supabase vía NestJS
   */
  cargarUsuarios(): Observable<Usuario[]> {
    this.cargandoUsuarios.set(true);
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.USUARIOS}`;
    console.log(`📤 [GET ${AUTH_ENDPOINTS.USUARIOS}] Consultando usuarios en el servidor...`);

    return this.http.get<any[]>(url).pipe(
      map((listaRaw) => (Array.isArray(listaRaw) ? listaRaw.map(this.normalizarUsuario.bind(this)) : [])),
      tap((usuarios) => {
        this.usuarios.set(usuarios);
        this.cargandoUsuarios.set(false);
        console.log(`📥 [GET ${AUTH_ENDPOINTS.USUARIOS}] ${usuarios.length} usuarios recibidos del backend:`, usuarios);
      }),
      catchError((err) => {
        this.cargandoUsuarios.set(false);
        console.warn(`⚠️ [GET ${AUTH_ENDPOINTS.USUARIOS}] Error al consultar usuarios:`, err.status, err.message);
        return of(this.usuarios());
      })
    );
  }

  /**
   * Ejecuta la autenticación real contra el endpoint /auth/login del backend
   */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.LOGIN}`;
    return this.http.post<LoginResponse>(url, credenciales).pipe(
      tap((res) => {
        const normalizado = this.normalizarUsuario(res.usuario);
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(TOKEN_KEY, res.accessToken);
          sessionStorage.setItem(USER_KEY, JSON.stringify(normalizado));
        }
        this.token.set(res.accessToken);
        this.currentUser.set(normalizado);
        // Cargar usuarios inmediatamente tras autenticarse con éxito
        this.cargarUsuarios().subscribe({ error: () => {} });
      })
    );
  }

  /**
   * Registra un nuevo usuario en la base de datos de Supabase vía NestJS.
   * Valida la respuesta HTTP: SOLO si la API responde 201 Created se añade a la lista.
   * Si la API responde 409 Conflict o error, NO se añade y se informa el error.
   */
  crearUsuario(dto: {
    nombre_completo: string;
    rut: string;
    email: string;
    password?: string;
    rol: RolUsuario;
  }): Observable<{ exito: boolean; mensaje: string; usuario?: Usuario }> {
    const payload: RegistroUsuarioDto = {
      nombreCompleto: dto.nombre_completo.trim(),
      rut: dto.rut.trim(),
      email: dto.email.trim().toLowerCase(),
      password: dto.password || '',
      rol: dto.rol
    };

    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.REGISTRO}`;
    console.log(`📤 [POST ${AUTH_ENDPOINTS.REGISTRO}] Enviando payload de registro a la API:`, payload);

    return this.http.post<any>(url, payload).pipe(
      map((res) => {
        console.log(`📥 [POST ${AUTH_ENDPOINTS.REGISTRO}] Respuesta exitosa del servidor:`, res);
        const nuevoRaw = res?.usuario || res;
        const nuevo = this.normalizarUsuario(nuevoRaw);

        // Agrega a la señal en memoria SOLO tras confirmación positiva de la base de datos
        this.usuarios.update((lista) => {
          const sinDuplicados = lista.filter(
            (u) =>
              u.email.toLowerCase() !== nuevo.email.toLowerCase() &&
              u.rut !== nuevo.rut
          );
          return [nuevo, ...sinDuplicados];
        });

        return {
          exito: true,
          mensaje: res?.mensaje || `Usuario ${nuevo.nombre_completo} creado exitosamente con rol ${nuevo.rol}.`,
          usuario: nuevo
        };
      }),
      catchError((err) => {
        console.error(`❌ [POST ${AUTH_ENDPOINTS.REGISTRO}] Error al registrar en Supabase:`, err.status, err.error);
        const rawMsg = err.error?.message;
        let mensaje = 'Error al registrar el usuario en el servidor.';
        if (Array.isArray(rawMsg)) {
          mensaje = rawMsg.join(', ');
        } else if (typeof rawMsg === 'string') {
          mensaje = rawMsg;
        } else if (err.status === 409) {
          mensaje = 'El correo electrónico o RUT ya se encuentra registrado en el sistema.';
        }

        return of({
          exito: false,
          mensaje
        });
      })
    );
  }

  /**
   * Conecta con el endpoint de edición de usuario.
   * Si el backend aún no implementa PATCH /auth/usuarios/:id, informa transparentemente.
   */
  actualizarUsuario(idUsuario: number, dto: ActualizarUsuarioDto): Observable<{ exito: boolean; mensaje: string; usuario?: Usuario }> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.USUARIO_POR_ID(idUsuario)}`;
    console.log(`📤 [PATCH ${AUTH_ENDPOINTS.USUARIO_POR_ID(idUsuario)}] Actualizando datos de usuario #${idUsuario}:`, dto);

    return this.http.patch<any>(url, dto).pipe(
      map((res) => {
        console.log(`📥 [PATCH ${AUTH_ENDPOINTS.USUARIO_POR_ID(idUsuario)}] Respuesta del servidor:`, res);
        const actualizado = this.normalizarUsuario(res?.usuario || res);
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id_usuario === idUsuario ? { ...u, ...actualizado } : u))
        );
        return {
          exito: true,
          mensaje: res?.mensaje || `Usuario ${actualizado.nombre_completo} actualizado exitosamente.`,
          usuario: actualizado
        };
      }),
      catchError((err) => {
        console.warn(`⚠️ [PATCH ${AUTH_ENDPOINTS.USUARIO_POR_ID(idUsuario)}] Error o endpoint no disponible:`, err.status);
        let mensaje = 'Error al actualizar el usuario en el servidor.';
        if (err.status === 404) {
          mensaje = `⚠️ El endpoint 'PATCH /api/auth/usuarios/${idUsuario}' aún no está implementado en el backend NestJS. La modificación no fue guardada.`;
        } else if (err.error?.message) {
          mensaje = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        return of({ exito: false, mensaje });
      })
    );
  }

  /**
   * Conecta con el endpoint para conmutar estado activo/inactivo del usuario.
   */
  conmutarEstadoUsuario(idUsuario: number, nuevoEstado: boolean): Observable<{ exito: boolean; mensaje: string }> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.CONMUTAR_ESTADO(idUsuario)}`;
    console.log(`📤 [PATCH ${AUTH_ENDPOINTS.CONMUTAR_ESTADO(idUsuario)}] Cambiando estado activo=${nuevoEstado}`);

    return this.http.patch<any>(url, { activo: nuevoEstado }).pipe(
      map((res) => {
        this.usuarios.update((lista) =>
          lista.map((u) => (u.id_usuario === idUsuario ? { ...u, activo: nuevoEstado } : u))
        );
        return {
          exito: true,
          mensaje: res?.mensaje || `Estado del usuario #${idUsuario} actualizado a ${nuevoEstado ? 'Activo' : 'Inactivo'}.`
        };
      }),
      catchError((err) => {
        console.warn(`⚠️ [PATCH ${AUTH_ENDPOINTS.CONMUTAR_ESTADO(idUsuario)}] Error o endpoint no disponible:`, err.status);
        let mensaje = 'Error al cambiar estado del usuario en el servidor.';
        if (err.status === 404) {
          mensaje = `⚠️ El endpoint 'PATCH /api/auth/usuarios/${idUsuario}/estado' aún no está implementado en el backend. El estado no fue modificado.`;
        } else if (err.error?.message) {
          mensaje = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        return of({ exito: false, mensaje });
      })
    );
  }

  /**
   * Conecta con el endpoint para actualizar la contraseña de un usuario en el sistema.
   */
  cambiarPassword(idUsuario: number, nuevaPassword: string): Observable<{ exito: boolean; mensaje: string }> {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      return of({ exito: false, mensaje: 'La contraseña debe contener al menos 6 caracteres.' });
    }

    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.CAMBIAR_PASSWORD(idUsuario)}`;
    console.log(`📤 [PATCH ${AUTH_ENDPOINTS.CAMBIAR_PASSWORD(idUsuario)}] Solicitando cambio de clave`);

    return this.http.patch<any>(url, { nuevaPassword }).pipe(
      map((res) => ({
        exito: true,
        mensaje: res?.mensaje || 'Contraseña actualizada con éxito en el servidor.'
      })),
      catchError((err) => {
        console.warn(`⚠️ [PATCH ${AUTH_ENDPOINTS.CAMBIAR_PASSWORD(idUsuario)}] Error o endpoint no disponible:`, err.status);
        let mensaje = 'Error al actualizar la contraseña en el servidor.';
        if (err.status === 404) {
          mensaje = `⚠️ El endpoint 'PATCH /api/auth/usuarios/${idUsuario}/password' aún no está implementado en el backend. La clave no fue cambiada.`;
        } else if (err.error?.message) {
          mensaje = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
        }
        return of({ exito: false, mensaje });
      })
    );
  }

  /**
   * Solicita al servidor los datos del perfil del usuario actualmente autenticado
   */
  obtenerPerfil(): Observable<any> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.PERFIL}`;
    return this.http.get<any>(url);
  }

  /**
   * Cierra la sesión activa, elimina los tokens de la memoria de sesión y redirige al login
   */
  logout(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
    this.usuarios.set([]);
    this.router.navigate(['/login']);
  }
}
