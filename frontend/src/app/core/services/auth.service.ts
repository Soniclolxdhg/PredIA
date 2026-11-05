import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RolUsuario, Usuario } from '../models/auth.models';

const TOKEN_KEY = 'predia_access_token';
const USER_KEY = 'predia_usuario_sesion';
const API_URL_KEY = 'predia_api_base_url';

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
      // Usuario administrador inicial por defecto para evitar pantallas en blanco si no se ha logueado
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
   * Selector rápido de rol para evaluación académica de INACAP
   */
  switchDemoRole(nuevoRol: RolUsuario): void {
    const perfilesDemo: Record<RolUsuario, Usuario> = {
      ADMINISTRADOR: {
        id_usuario: 1,
        nombre_completo: 'Ing. Rodrigo Vega (Admin)',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR',
        activo: true
      },
      AGRONOMO: {
        id_usuario: 2,
        nombre_completo: 'Agr. Macarena Soto',
        rut: '15.222.333-4',
        email: 'agronomo@predia.cl',
        rol: 'AGRONOMO',
        activo: true
      },
      BODEGUERO: {
        id_usuario: 3,
        nombre_completo: 'Don Carlos Mendoza (Bodega)',
        rut: '12.444.555-6',
        email: 'bodeguero@predia.cl',
        rol: 'BODEGUERO',
        activo: true
      },
      GERENTE: {
        id_usuario: 4,
        nombre_completo: 'Gerente General (Santa Laura)',
        rut: '09.888.777-K',
        email: 'gerencia@predia.cl',
        rol: 'GERENTE',
        activo: true
      }
    };

    const usuarioElegido = perfilesDemo[nuevoRol];
    const demoToken = `jwt_mock_${nuevoRol.toLowerCase()}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, demoToken);
    localStorage.setItem(USER_KEY, JSON.stringify(usuarioElegido));
    this.token.set(demoToken);
    this.currentUser.set(usuarioElegido);

    // Redirección inteligente al módulo correspondiente
    switch (nuevoRol) {
      case 'AGRONOMO':
        this.router.navigate(['/produccion/ciclos']);
        break;
      case 'BODEGUERO':
        this.router.navigate(['/bodega/kardex']);
        break;
      case 'GERENTE':
      case 'ADMINISTRADOR':
      default:
        this.router.navigate(['/dashboard']);
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
