import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioSesion } from '../models/auth.models';

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

  readonly currentUser = signal<UsuarioSesion | null>(
    this.recuperarUsuarioInicial()
  );

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.rol ?? null);

  private recuperarUsuarioInicial(): UsuarioSesion | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  /**
   * Cambia la URL base de la API (Render vs Localhost)
   */
  setBaseUrl(url: string): void {
    const sanitized = url.trim().replace(/\/+$/, '');
    this.baseUrl.set(sanitized);
    localStorage.setItem(API_URL_KEY, sanitized);
  }

  /**
   * Obtiene el token activo de la sesión
   */
  getToken(): string | null {
    return this.token();
  }

  /**
   * Inicia sesión contra el backend de PredIA
   */
  login(credenciales: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl()}/auth/login`;
    return this.http.post<LoginResponse>(url, credenciales).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
        this.token.set(res.accessToken);
        this.currentUser.set(res.usuario);
      })
    );
  }

  /**
   * Consulta el endpoint protegido de perfil para verificar el token
   */
  obtenerPerfil(): Observable<any> {
    const url = `${this.baseUrl()}/auth/perfil`;
    return this.http.get<any>(url);
  }

  /**
   * Cierra la sesión activa y limpia almacenamiento local
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}

