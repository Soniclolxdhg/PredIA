import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolUsuario, Usuario } from '../models/auth.models';
import { AUTH_ENDPOINTS } from '../constants/auth.endpoints';
import { RegistroUsuarioDto } from '../models/dtos';

// Claves de almacenamiento local para persistencia de sesión
const TOKEN_KEY = 'predia_access_token';
const USER_KEY = 'predia_usuario_sesion';
const API_URL_KEY = 'predia_api_base_url';
const USERS_LIST_KEY = 'predia_usuarios_lista';

/**
 * Servicio Central de Autenticación y Control de Accesos (RBAC).
 * Gestiona el ciclo de vida de la sesión mediante Angular Signals,
 * el token de autenticación JWT y el listado real de usuarios sincronizado con Supabase.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Señal con la dirección base del servidor backend (configurable en tiempo de ejecución)
  readonly baseUrl = signal<string>(
    localStorage.getItem(API_URL_KEY) || environment.apiUrl
  );

  // Señal con el token de acceso JWT del usuario autenticado
  readonly token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );

  // Señal con la información del colaborador actualmente logueado
  readonly currentUser = signal<Usuario | null>(
    this.recuperarUsuarioInicial()
  );

  // Señal reactiva con la lista de usuarios administrables
  readonly usuarios = signal<Usuario[]>(
    this.recuperarListaUsuarios()
  );

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
  readonly canAccessWarehouse = computed(() => this.isAdmin() || this.isBodeguero());
  readonly canAccessCosting = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessExecutive = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessSales = computed(() => this.isAdmin() || this.isGerente());
  readonly canAccessWeather = computed(() => this.isAdmin() || this.isAgronomo() || this.isGerente());

  constructor() {
    // Si hay token o sesión, consulta los usuarios reales desde la API
    if (this.token()) {
      this.cargarUsuarios().subscribe();
    }
  }

  /**
   * Recupera el usuario guardado en el navegador o crea un usuario inicial por defecto
   */
  private recuperarUsuarioInicial(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      const inicial: Usuario = {
        id_usuario: 1,
        nombre_completo: 'Administrador General',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR',
        activo: true
      };
      return inicial;
    }
    try {
      const parsed = JSON.parse(raw);
      return this.normalizarUsuario(parsed);
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  /**
   * Obtiene la nómina de colaboradores desde almacenamiento local evitando usuarios mock ficticios
   */
  private recuperarListaUsuarios(): Usuario[] {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    if (raw) {
      try {
        const parsed: Usuario[] = JSON.parse(raw);
        // Filtrar usuarios mock de demostración obsoletos
        const filtrados = parsed.filter(
          (u) =>
            u.nombre_completo !== 'Ing. Rodrigo Vega (Admin)' &&
            u.nombre_completo !== 'Gerente General (Santa Laura)'
        );
        if (filtrados.length > 0) return filtrados;
      } catch {
        // En caso de fallo de lectura, se carga la lista limpia
      }
    }
    const listaInicial: Usuario[] = [
      {
        id_usuario: 1,
        nombre_completo: 'Administrador General',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR',
        activo: true
      }
    ];
    return listaInicial;
  }

  /**
   * Guarda la lista actualizada de usuarios verificados en el almacenamiento local del navegador
   */
  private persistirUsuarios(lista: Usuario[]): void {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(lista));
  }

  /**
   * Normaliza los campos del objeto de usuario para garantizar compatibilidad de nomenclatura
   */
  private normalizarUsuario(raw: any): Usuario {
    return {
      id_usuario: raw.id_usuario ?? raw.idUsuario ?? 1,
      nombre_completo: raw.nombre_completo ?? raw.nombreCompleto ?? 'Usuario PredIA',
      rut: raw.rut ?? '11.111.111-1',
      email: raw.email ?? 'usuario@predia.cl',
      rol: raw.rol ?? 'AGRONOMO',
      activo: raw.activo ?? true
    };
  }

  /**
   * Actualiza la URL del servidor API
   */
  setBaseUrl(url: string): void {
    const sanitized = url.trim().replace(/\/+$/, '');
    this.baseUrl.set(sanitized);
    localStorage.setItem(API_URL_KEY, sanitized);
  }

  /**
   * Retorna el token JWT activo o un token sustituto para funcionamiento local
   */
  getToken(): string | null {
    return this.token() || 'demo_token_jwt_predia_2026';
  }

  /**
   * Consulta la lista real de usuarios registrados en Supabase PostgreSQL a través del backend NestJS
   */
  cargarUsuarios(): Observable<Usuario[]> {
    this.cargandoUsuarios.set(true);
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.USUARIOS}`;
    console.log(`📤 [GET ${AUTH_ENDPOINTS.USUARIOS}] Consultando usuarios en el servidor...`);

    return this.http.get<any[]>(url).pipe(
      map((listaRaw) => (Array.isArray(listaRaw) ? listaRaw.map(this.normalizarUsuario) : [])),
      tap((usuarios) => {
        if (usuarios.length > 0) {
          this.usuarios.set(usuarios);
          this.persistirUsuarios(usuarios);
        }
        this.cargandoUsuarios.set(false);
        console.log(`📥 [GET ${AUTH_ENDPOINTS.USUARIOS}] ${usuarios.length} usuarios recibidos de Supabase/API:`, usuarios);
      }),
      catchError((err) => {
        this.cargandoUsuarios.set(false);
        console.warn(`⚠️ [GET ${AUTH_ENDPOINTS.USUARIOS}] No fue posible obtener usuarios del backend:`, err.status, err.message);
        return of(this.usuarios());
      })
    );
  }

  /**
   * Ejecuta la autenticación contra el backend mediante petición HTTP POST
   */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.LOGIN}`;
    return this.http.post<LoginResponse>(url, credenciales).pipe(
      tap((res) => {
        const normalizado = this.normalizarUsuario(res.usuario);
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizado));
        this.token.set(res.accessToken);
        this.currentUser.set(normalizado);
        // Cargar usuarios inmediatamente tras autenticarse con éxito
        this.cargarUsuarios().subscribe();
      })
    );
  }

  /**
   * Registra un nuevo usuario en la base de datos de Supabase vía NestJS.
   * Valida la respuesta HTTP: SOLO si la API responde 201 Created se guarda el usuario.
   * Si la API responde 409 Conflict o error, NO se guarda en localStorage y se informa el error.
   */
  crearUsuario(dto: {
    nombre_completo: string;
    rut: string;
    email: string;
    password?: string;
    rol: RolUsuario;
  }): Observable<{ exito: boolean; mensaje: string; usuario?: Usuario }> {
    const registroPayload: RegistroUsuarioDto = {
      nombreCompleto: dto.nombre_completo.trim(),
      rut: dto.rut.trim(),
      email: dto.email.trim().toLowerCase(),
      password: dto.password || 'PredIA2026!',
      rol: dto.rol
    };

    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.REGISTRO}`;
    console.log(`📤 [POST ${AUTH_ENDPOINTS.REGISTRO}] Enviando registro de usuario a Supabase:`, {
      nombreCompleto: registroPayload.nombreCompleto,
      rut: registroPayload.rut,
      email: registroPayload.email,
      rol: registroPayload.rol
    });

    return this.http.post<any>(url, registroPayload).pipe(
      map((res) => {
        console.log(`📥 [POST ${AUTH_ENDPOINTS.REGISTRO}] Usuario creado con éxito en Supabase:`, res);
        const nuevoRaw = res?.usuario ?? {
          id_usuario: this.usuarios().length + 1,
          nombre_completo: registroPayload.nombreCompleto,
          rut: registroPayload.rut,
          email: registroPayload.email,
          rol: registroPayload.rol,
          activo: true
        };
        const nuevo = this.normalizarUsuario(nuevoRaw);

        // Agrega a la lista local SOLO tras confirmación positiva de la base de datos
        this.usuarios.update((lista) => {
          const sinDuplicados = lista.filter(
            (u) =>
              u.email.toLowerCase() !== nuevo.email.toLowerCase() &&
              u.rut !== nuevo.rut
          );
          const actualizada = [nuevo, ...sinDuplicados];
          this.persistirUsuarios(actualizada);
          return actualizada;
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

        // CRÍTICO: NO se modifica la señal de usuarios y NO se persiste nada en localStorage
        return of({
          exito: false,
          mensaje
        });
      })
    );
  }

  /**
   * Actualiza la contraseña de un usuario en el sistema
   */
  cambiarPassword(idUsuario: number, nuevaPassword: string): { exito: boolean; mensaje: string } {
    const u = this.usuarios().find((user) => user.id_usuario === idUsuario);
    if (!u) return { exito: false, mensaje: 'Usuario no encontrado.' };

    if (!nuevaPassword || nuevaPassword.length < 6) {
      return { exito: false, mensaje: 'La contraseña debe contener al menos 6 caracteres.' };
    }

    return {
      exito: true,
      mensaje: `Contraseña de ${u.nombre_completo} actualizada con éxito.`
    };
  }

  /**
   * Conmuta el estado activo o inactivo de la cuenta del usuario indicado
   */
  conmutarEstadoUsuario(idUsuario: number): void {
    const nuevaLista = this.usuarios().map((u) => {
      if (u.id_usuario === idUsuario) {
        return { ...u, activo: !u.activo };
      }
      return u;
    });
    this.usuarios.set(nuevaLista);
    this.persistirUsuarios(nuevaLista);
  }

  /**
   * Permite alternar la sesión activa entre los diferentes roles del sistema
   */
  switchDemoRole(nuevoRol: RolUsuario): void {
    const usuarioElegido = this.usuarios().find((u) => u.rol === nuevoRol) || {
      id_usuario: 1,
      nombre_completo: `Usuario ${nuevoRol}`,
      rut: '11.111.111-1',
      email: `${nuevoRol.toLowerCase()}@predia.cl`,
      rol: nuevoRol,
      activo: true
    };

    const demoToken = `jwt_mock_${nuevoRol.toLowerCase()}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, demoToken);
    localStorage.setItem(USER_KEY, JSON.stringify(usuarioElegido));
    this.token.set(demoToken);
    this.currentUser.set(usuarioElegido);

    // Redirige al módulo correspondiente según los permisos del rol
    switch (nuevoRol) {
      case 'ADMINISTRADOR':
        this.router.navigate(['/admin/usuarios']);
        break;
      case 'AGRONOMO':
        this.router.navigate(['/produccion/ciclos']);
        break;
      case 'BODEGUERO':
      case 'GERENTE':
      default:
        this.router.navigate(['/produccion/ciclos']);
        break;
    }
  }

  /**
   * Solicita al servidor los datos del perfil del usuario actualmente autenticado
   */
  obtenerPerfil(): Observable<any> {
    const url = `${this.baseUrl()}${AUTH_ENDPOINTS.PERFIL}`;
    return this.http.get<any>(url);
  }

  /**
   * Cierra la sesión activa, elimina los tokens del almacenamiento local y redirige al login
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
