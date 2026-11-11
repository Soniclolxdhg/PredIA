import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <!-- Barra Superior -->
      <header class="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            🌾
          </div>
          <div>
            <div class="text-base font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              <span>PredIA</span>
              <span class="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">FASE 1</span>
            </div>
            <div class="text-xs text-slate-500">Santa Laura Ltda. &bull; Proyecto de Integración INACAP</div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <div class="text-xs font-bold text-slate-800">{{ authService.currentUser()?.nombre_completo }}</div>
            <div class="text-[10px] text-slate-500">{{ authService.currentUser()?.email }}</div>
          </div>

          <span
            [class]="getBadgeClase(authService.userRole())"
            class="px-2.5 py-1 text-xs font-bold rounded-full border shadow-xs tracking-wide">
            {{ authService.userRole() }}
          </span>

          <button
            type="button"
            (click)="authService.logout()"
            class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors touch-target flex items-center gap-1.5"
            title="Cerrar Sesión">
            <span>🚪</span>
            <span class="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <!-- Contenido Principal -->
      <main class="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        <!-- Banner de Bienvenida -->
        <div class="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-1 rounded-full">
              Entrega 1: Módulo de Autenticación & Acceso Autorizado
            </span>
            <h2 class="text-2xl font-black mt-2">
              ¡Bienvenido, {{ authService.currentUser()?.nombre_completo }}! 👋
            </h2>
            <p class="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
              Has iniciado sesión exitosamente en la plataforma. Tu sesión está respaldada por un token Bearer JWT autenticado contra el backend en Render.
            </p>
          </div>

          <div class="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center self-start sm:self-auto min-w-[160px]">
            <div class="text-xs text-emerald-200 uppercase font-bold">Estado de Sesión</div>
            <div class="text-xl font-black text-white mt-0.5 flex items-center justify-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Activa</span>
            </div>
            <div class="text-[11px] text-emerald-200 mt-1">Rol: <strong>{{ authService.userRole() }}</strong></div>
          </div>
        </div>

        <!-- Tarjetas de Información del Usuario Autenticado -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-500 uppercase">RUT USUARIO</span>
            <div class="text-lg font-black text-slate-800 mt-1 font-mono">{{ authService.currentUser()?.rut }}</div>
            <p class="text-xs text-slate-400 mt-0.5">Identificador nacional verificado</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-500 uppercase">CORREO CORPORATIVO</span>
            <div class="text-lg font-black text-slate-800 mt-1 truncate">{{ authService.currentUser()?.email }}</div>
            <p class="text-xs text-slate-400 mt-0.5">Cuenta institucional PredIA</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span class="text-xs font-bold text-slate-500 uppercase">ROL ASIGNADO (RBAC)</span>
            <div class="text-lg font-black text-emerald-700 mt-1">{{ authService.userRole() }}</div>
            <p class="text-xs text-slate-400 mt-0.5">Permisos de acceso delimitados</p>
          </div>
        </div>

        <!-- Verificador del Token JWT contra /auth/perfil -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl">🔐</span>
                <h3 class="text-base font-bold text-slate-900">Validación de Token con Backend Real (GET /auth/perfil)</h3>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Servidor activo: <code>{{ authService.baseUrl() }}</code> &bull; Cabecera: <code>Authorization: Bearer &lt;token&gt;</code>
              </p>
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                (click)="copiarToken()"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                {{ tokenCopiado() ? '✓ Token Copiado!' : '📋 Copiar Token' }}
              </button>
              <button
                type="button"
                (click)="testToken()"
                [disabled]="cargandoPerfil()"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                <span *ngIf="cargandoPerfil()" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ cargandoPerfil() ? 'Consultando...' : '🔄 Probar /auth/perfil' }}</span>
              </button>
            </div>
          </div>

          <div *ngIf="perfilRespuesta()" class="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto shadow-inner">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Respuesta HTTP 200 OK del Backend:</div>
            <pre>{{ perfilRespuesta() }}</pre>
          </div>
        </div>

        <!-- Cronograma de Entregas Progresivas -->
        <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span>📅</span>
              <span>Cronograma de Despliegue Progresivo del Sistema</span>
            </h3>
            <span class="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Paso 1 de 6 Desplegado
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- Paso 1 -->
            <div class="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                <span>FASE 1 (ACTUAL)</span>
                <span class="text-base">✅</span>
              </div>
              <div class="font-bold text-slate-900 text-sm">Autenticación & Login</div>
              <p class="text-xs text-slate-600 mt-1">
                Tokens JWT en LocalStorage, validaciones reactivas y conexión a Render.
              </p>
            </div>

            <!-- Paso 2 -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>FASE 2</span>
                <span class="text-base">⏳</span>
              </div>
              <div class="font-bold text-slate-800 text-sm">Producción & Campo</div>
              <p class="text-xs text-slate-500 mt-1">
                Naves, Ciclos de Cultivo (HU01), Labores táctiles (HU02) y Pesaje (HU03).
              </p>
            </div>

            <!-- Paso 3 -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>FASE 3</span>
                <span class="text-base">⏳</span>
              </div>
              <div class="font-bold text-slate-800 text-sm">Bodega & Kardex</div>
              <p class="text-xs text-slate-500 mt-1">
                Kardex PMP, % Merma en semillas (HU04) y Alertas de Stock Crítico (HU05).
              </p>
            </div>

            <!-- Paso 4 -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>FASE 4</span>
                <span class="text-base">⏳</span>
              </div>
              <div class="font-bold text-slate-800 text-sm">Costos & Mano de Obra</div>
              <p class="text-xs text-slate-500 mt-1">
                Jornales devengados (HU06), Indirectos prorrateados (HU07) y $/Kg (HU09).
              </p>
            </div>

            <!-- Paso 5 -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>FASE 5</span>
                <span class="text-base">⏳</span>
              </div>
              <div class="font-bold text-slate-800 text-sm">Comercial & Ventas</div>
              <p class="text-xs text-slate-500 mt-1">
                Catálogo de Clientes (HU08) y Notas de Venta con Margen Bruto (HU10).
              </p>
            </div>

            <!-- Paso 6 -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                <span>FASE 6</span>
                <span class="text-base">⏳</span>
              </div>
              <div class="font-bold text-slate-800 text-sm">Dashboard & Agroclima</div>
              <p class="text-xs text-slate-500 mt-1">
                Gráficos Chart.js, Open-Meteo y Alerta Preventiva de Helada &lt; 2°C (HU11/12).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);

  readonly perfilRespuesta = signal<string | null>(null);
  readonly cargandoPerfil = signal(false);
  readonly tokenCopiado = signal(false);

  ngOnInit(): void {
    this.testToken();
  }

  getBadgeClase(rol: string | null | undefined): string {
    switch (rol) {
      case 'ADMINISTRADOR': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'AGRONOMO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'BODEGUERO': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'GERENTE': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  copiarToken(): void {
    const t = this.authService.getToken();
    if (!t) return;
    navigator.clipboard.writeText(t).then(() => {
      this.tokenCopiado.set(true);
      setTimeout(() => this.tokenCopiado.set(false), 2000);
    });
  }

  testToken(): void {
    this.cargandoPerfil.set(true);
    this.authService.obtenerPerfil().subscribe({
      next: (res) => {
        this.cargandoPerfil.set(false);
        this.perfilRespuesta.set(JSON.stringify(res, null, 2));
      },
      error: (err) => {
        this.cargandoPerfil.set(false);
        this.perfilRespuesta.set(`Error ${err.status}: ${JSON.stringify(err.error || err.message)}`);
      }
    });
  }
}
