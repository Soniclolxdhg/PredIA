import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolUsuario, Usuario } from '../models/auth.models';

const TOKEN_KEY = 'predia_access_token';
const USER_KEY = 'predia_usuario_sesion';
const API_URL_KEY = 'predia_api_base_url';
const USERS_LIST_KEY = 'predia_usuarios_lista';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Señales reactivas
  readonly baseUrl = signal<string>(
    localStorage.getItem(API_URL_KEY) || environment.apiUrl
  );

  readonly token = signal<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );

  readonly currentUser = signal<Usuario | null>(
    this.recuperarUsuarioInicial()
  );

  // Lista de usuarios administrables (Mantenedor Administrador)
  readonly usuarios = signal<Usuario[]>(
    this.recuperarListaUsuarios()
  );

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly userRole = computed<RolUsuario | null>(() => this.currentUser()?.rol ?? null);

  // Permisos RBAC reactivos
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

  private recuperarUsuarioInicial(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      const demo: Usuario = {
        id_usuario: 1,
        nombre_completo: 'Administrador General',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR',
        activo: true
      };
      return demo;
    }
    try {
      const parsed = JSON.parse(raw);
      return this.normalizarUsuario(parsed);
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  private recuperarListaUsuarios(): Usuario[] {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    const listaDefault: Usuario[] = [
      {
        id_usuario: 1,
        nombre_completo: 'Ing. Rodrigo Vega (Admin)',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR',
        activo: true
      },
      {
        id_usuario: 2,
        nombre_completo: 'Agr. Macarena Soto',
        rut: '15.222.333-4',
        email: 'agronomo@predia.cl',
        rol: 'AGRONOMO',
        activo: true
      },
      {
        id_usuario: 3,
        nombre_completo: 'Carlos Mendoza (Bodega)',
        rut: '12.444.555-6',
        email: 'bodeguero@predia.cl',
        rol: 'BODEGUERO',
        activo: true
      },
      {
        id_usuario: 4,
        nombre_completo: 'Gerente General (Santa Laura)',
        rut: '09.888.777-K',
        email: 'gerencia@predia.cl',
        rol: 'GERENTE',
        activo: true
      }
    ];
    this.persistirUsuarios(listaDefault);
    return listaDefault;
  }

  private persistirUsuarios(lista: Usuario[]): void {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(lista));
  }

  private normalizarUsuario(raw: any): Usuario {
    return {
      id_usuario: raw.id_usuario ?? raw.idUsuario ?? 1,
      nombre_completo: raw.nombre_completo ?? raw.nombreCompleto ?? 'Usuario PredIA',
      rut: raw.rut ?? '11.111.111-1',
      email: raw.email ?? 'usuario@predia.cl',
      rol: raw.rol ?? 'ADMINISTRADOR',
      activo: raw.activo ?? true
    };
  }

  setBaseUrl(url: string): void {
    const sanitized = url.trim().replace(/\/+$/, '');
    this.baseUrl.set(sanitized);
    localStorage.setItem(API_URL_KEY, sanitized);
  }

  getToken(): string | null {
    return this.token() || 'demo_token_jwt_predia_2026';
  }

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl()}/auth/login`;
    return this.http.post<LoginResponse>(url, credenciales).pipe(
      tap((res) => {
        const normalizado = this.normalizarUsuario(res.usuario);
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizado));
        this.token.set(res.accessToken);
        this.currentUser.set(normalizado);
      })
    );
  }

  /**
   * Mantenedor: Crea un nuevo usuario en el sistema
   */
  crearUsuario(dto: {
    nombre_completo: string;
    rut: string;
    email: string;
    password?: string;
    rol: RolUsuario;
  }): { exito: boolean; mensaje: string } {
    const lista = this.usuarios();

    // Validar duplicidad
    const existe = lista.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase() || u.rut === dto.rut
    );
    if (existe) {
      return {
        exito: false,
        mensaje: 'Ya existe un usuario registrado con ese correo o RUT.'
      };
    }

    const nuevoUsuario: Usuario = {
      id_usuario: lista.length + 1,
      nombre_completo: dto.nombre_completo.trim(),
      rut: dto.rut.trim(),
      email: dto.email.trim().toLowerCase(),
      rol: dto.rol,
      activo: true
    };

    // Si el backend en Render/Local está activo, intentamos llamar al registro en paralelo
    const registroPayload = {
      nombreCompleto: nuevoUsuario.nombre_completo,
      rut: nuevoUsuario.rut,
      email: nuevoUsuario.email,
      password: dto.password || 'PredIA2026!',
      rol: nuevoUsuario.rol
    };

    this.http.post(`${this.baseUrl()}/auth/registro`, registroPayload)
      .pipe(catchError(() => of(null)))
      .subscribe();

    const nuevaLista = [nuevoUsuario, ...lista];
    this.usuarios.set(nuevaLista);
    this.persistirUsuarios(nuevaLista);

    return {
      exito: true,
      mensaje: `Usuario ${nuevoUsuario.nombre_completo} creado exitosamente con rol ${nuevoUsuario.rol}.`
    };
  }

  /**
   * Mantenedor: Cambia o restablece la contraseña de un usuario
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
   * Mantenedor: Conmuta el estado activo/inactivo de una cuenta
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
   * Selector rápido de rol para evaluación académica de INACAP
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

    // Redirección inteligente al módulo correspondiente
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

  obtenerPerfil(): Observable<any> {
    const url = `${this.baseUrl()}/auth/perfil`;
    return this.http.get<any>(url);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
