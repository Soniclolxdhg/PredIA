import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { ItemChecklist, InspeccionNave, Nave } from '../../core/models/erp.models';

/**
 * Componente de Checklist e Inspección de Naves en Terreno (Tablet / Smartphone).
 * Permite a agrónomos y técnicos supervisar físicamente el estado de los invernaderos,
 * verificando sanidad vegetal, líneas de riego, estado de cubiertas, entutorado y bioseguridad.
 */
@Component({
  selector: 'app-checklist-naves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto pb-12">
      <!-- Encabezado Tablet-First -->
      <div class="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-emerald-700/40">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold tracking-wide uppercase mb-2 border border-emerald-400/30">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Supervisión de Invernaderos • Santa Laura Ltda.
            </div>
            <h1 class="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <span>📋</span>
              <span>Checklist de Inspección de Naves (Tablet)</span>
            </h1>
            <p class="text-xs sm:text-sm text-emerald-100 mt-1">
              Supervisión física de terreno: cultivo principal de <strong>Tomate Larga Vida (SEM-TOM-01)</strong> y hortalizas protegidas (sanidad vegetal, líneas de riego, entutorado y bioseguridad).
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="bg-white/10 px-3 py-2 rounded-xl text-xs backdrop-blur-xs border border-white/20">
              Inspector: <strong class="text-white block">{{ authService.currentUser()?.nombre_completo || 'Agrónomo de Terreno' }}</strong>
            </div>
            <button
              type="button"
              (click)="marcarTodoConforme()"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all touch-target">
              <span>⚡</span>
              <span>Marcar Todo Conforme</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Alerta de Éxito al Registrar -->
      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-bold">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-700 font-bold">✕</button>
      </div>

      <!-- Indicador de Carga de Naves -->
      <div *ngIf="erpService.cargandoNaves()" class="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <span class="inline-block animate-spin text-2xl mb-2">🔄</span>
        <p class="text-xs text-slate-600 font-medium">Cargando naves desde Supabase...</p>
      </div>

      <!-- Estado si no hay naves registradas en Supabase -->
      <div *ngIf="!erpService.cargandoNaves() && erpService.naves().length === 0" class="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 shadow-xs">
        <span class="text-3xl">🏡</span>
        <h3 class="font-bold text-amber-900 text-sm mt-2">No hay naves registradas en la base de datos de Supabase</h3>
        <p class="text-xs text-amber-700 max-w-md mx-auto mt-1 mb-4">
          Para realizar inspecciones de terreno, primero deben registrarse las naves de Santa Laura Ltda. en Supabase.
        </p>
        <button
          type="button"
          (click)="inicializarNaves()"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
          <span>🌱</span>
          <span>Inicializar Naves en Supabase</span>
        </button>
      </div>

      <!-- Selector Táctil de Nave (Pestañas Grandes) -->
      <div *ngIf="!erpService.cargandoNaves() && erpService.naves().length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          *ngFor="let n of erpService.naves()"
          type="button"
          (click)="seleccionarNave(n)"
          [class]="naveSeleccionada()?.id_nave === n.id_nave ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-500/50' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'"
          class="p-3.5 rounded-2xl border text-left transition-all touch-target flex flex-col justify-between">
          <div class="flex items-center justify-between w-full mb-1">
            <span class="text-xs font-mono font-black" [class]="naveSeleccionada()?.id_nave === n.id_nave ? 'bg-emerald-900 text-emerald-100 px-2 py-0.5 rounded' : 'bg-slate-100 text-slate-600 px-2 py-0.5 rounded'">
              {{ n.codigo_nave }}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border" [class]="getClaseEstadoNave(n.estado)">
              {{ n.estado }}
            </span>
          </div>
          <div class="font-black text-sm truncate">{{ n.nombre }}</div>
          <div class="text-[11px] mt-0.5" [class]="naveSeleccionada()?.id_nave === n.id_nave ? 'text-emerald-100' : 'text-slate-500'">
            {{ getVariedadNave(n.id_nave) }}
          </div>
        </button>
      </div>

      <!-- Ficha de la Nave & Resumen de Conformidad -->
      <div *ngIf="naveSeleccionada() as nave" class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                {{ nave.codigo_nave }}
              </span>
              <h2 class="text-lg font-black text-slate-800">{{ nave.nombre }}</h2>
              <span *ngIf="nave.id_nave === 1" class="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                🍅 Especialidad Santa Laura (SEM-TOM-01)
              </span>
              <span *ngIf="nave.id_nave === 2" class="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                🫑 Hortaliza Complementaria
              </span>
            </div>
            <div class="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-2 items-center">
              <span>Superficie: <strong>{{ nave.superficie_m2 | number }} m²</strong></span> •
              <span>Estructura: <strong>{{ nave.tipo_estructura }}</strong></span> •
              <span>Cultivo Activo: <strong class="text-emerald-700 font-bold">{{ getVariedadNave(nave.id_nave) }}</strong></span>
            </div>
          </div>

          <!-- Métricas de Conformidad en Tiempo Real -->
          <div class="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div class="text-center px-2">
              <div class="text-[10px] font-bold text-slate-500 uppercase">Cumplimiento</div>
              <div class="text-xl font-black" [class]="porcentajeCumplimiento() >= 90 ? 'text-emerald-600' : (porcentajeCumplimiento() >= 70 ? 'text-amber-600' : 'text-rose-600')">
                {{ porcentajeCumplimiento() }}%
              </div>
            </div>
            <div class="text-xs space-y-0.5 text-slate-600 font-medium border-l border-slate-200 pl-3">
              <div class="text-emerald-700 font-bold">✓ {{ totalConforme() }} Conforme</div>
              <div class="text-amber-700 font-bold">⚠️ {{ totalObservado() }} Observado</div>
              <div class="text-rose-700 font-bold">✗ {{ totalNoConforme() }} Crítico</div>
            </div>
          </div>
        </div>

        <!-- Barra de Progreso Visual de Conformidad -->
        <div>
          <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Progreso de Verificación Sanitaria y Operativa</span>
            <span class="font-bold font-mono">{{ totalVerificados() }} / {{ itemsChecklist().length }} Verificados</span>
          </div>
          <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex border border-slate-200">
            <div [style.width.%]="(totalConforme() / itemsChecklist().length) * 100" class="bg-emerald-600 transition-all duration-300"></div>
            <div [style.width.%]="(totalObservado() / itemsChecklist().length) * 100" class="bg-amber-500 transition-all duration-300"></div>
            <div [style.width.%]="(totalNoConforme() / itemsChecklist().length) * 100" class="bg-rose-600 transition-all duration-300"></div>
          </div>
        </div>

        <!-- Pauta de Verificación (Checklist de 10 Puntos) -->
        <div class="space-y-3 pt-2">
          <div class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Pauta de Inspección Física (10 Puntos de Control)</span>
            <span class="text-[11px] text-slate-400 font-normal">Toque el estado para calificar</span>
          </div>

          <div class="space-y-2.5">
            <div
              *ngFor="let item of itemsChecklist(); let i = index"
              class="p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              [class]="getClaseContenedorItem(item.estado)">
              <!-- Descripción del Punto de Control -->
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase" [class]="getClaseCategoria(item.categoria)">
                    {{ item.categoria }}
                  </span>
                  <span class="font-bold text-sm text-slate-800">{{ i + 1 }}. {{ item.titulo }}</span>
                </div>
                <p class="text-xs text-slate-600 mt-1 pl-0.5">
                  {{ item.descripcion }}
                </p>
              </div>

              <!-- Botones Táctiles de Calificación (Grandes para Dedos en Terreno) -->
              <div class="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                <!-- Conforme -->
                <button
                  type="button"
                  (click)="cambiarEstadoItem(item, 'CONFORME')"
                  [class]="item.estado === 'CONFORME' ? 'bg-emerald-700 text-white font-bold border-emerald-800 shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'"
                  class="px-3 py-2 rounded-xl text-xs border font-semibold transition-all touch-target flex items-center justify-center gap-1">
                  <span>✓</span>
                  <span>Conforme</span>
                </button>

                <!-- Observado -->
                <button
                  type="button"
                  (click)="cambiarEstadoItem(item, 'OBSERVADO')"
                  [class]="item.estado === 'OBSERVADO' ? 'bg-amber-600 text-white font-bold border-amber-700 shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'"
                  class="px-3 py-2 rounded-xl text-xs border font-semibold transition-all touch-target flex items-center justify-center gap-1">
                  <span>⚠️</span>
                  <span>Observado</span>
                </button>

                <!-- No Conforme -->
                <button
                  type="button"
                  (click)="cambiarEstadoItem(item, 'NO_CONFORME')"
                  [class]="item.estado === 'NO_CONFORME' ? 'bg-rose-700 text-white font-bold border-rose-800 shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'"
                  class="px-3 py-2 rounded-xl text-xs border font-semibold transition-all touch-target flex items-center justify-center gap-1">
                  <span>✗</span>
                  <span>Crítico</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Observaciones y Guardado de la Inspección -->
        <div class="pt-4 border-t border-slate-100 space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Observaciones & Recomendaciones Técnicas del Inspector
            </label>
            <textarea
              [(ngModel)]="observacionesGenerales"
              rows="2"
              placeholder="Detalle anomalías encontradas, sectores afectados o tareas correctivas a realizar..."
              class="w-full p-3 text-sm rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none"></textarea>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="reiniciarPauta()"
              class="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-xl">
              Restablecer Pauta
            </button>
            <button
              type="button"
              (click)="guardarInspeccion()"
              class="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md transition-all touch-target flex items-center justify-center gap-2">
              <span>💾</span>
              <span>Guardar Inspección de Nave</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Historial de Inspecciones Guardadas -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div class="font-bold text-sm text-slate-800 flex items-center gap-2">
            <span>📑</span>
            <span>Historial de Inspecciones en Terreno</span>
          </div>
          <span class="text-xs text-slate-500 font-mono">{{ erpService.inspecciones().length }} registradas</span>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            *ngFor="let insp of erpService.inspecciones()"
            class="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                  {{ insp.codigo_nave }}
                </span>
                <span class="font-bold text-slate-900 text-sm">{{ insp.nombre_nave }}</span>
                <span [class]="getBadgeEstadoGeneral(insp.estado_general)" class="text-[10px] font-bold px-2 py-0.5 rounded-full border">
                  {{ insp.estado_general }}
                </span>
              </div>
              <div class="text-xs text-slate-500 space-x-2">
                <span>Fecha: <strong>{{ insp.fecha_inspeccion }}</strong></span> •
                <span>Inspector: <strong>{{ insp.inspector }}</strong></span> •
                <span>Conformidad: <strong class="text-emerald-700 font-bold">{{ insp.porcentaje_cumplimiento }}%</strong></span>
              </div>
              <div *ngIf="insp.observaciones" class="text-xs text-slate-600 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                "{{ insp.observaciones }}"
              </div>
            </div>

            <div class="text-xs text-slate-500 flex sm:flex-col items-center sm:items-end gap-1.5 self-start sm:self-auto">
              <span class="font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                ✓ {{ insp.total_conforme }} | ⚠️ {{ insp.total_observado }} | ✗ {{ insp.total_no_conforme }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChecklistNavesComponent {
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);

  readonly mensajeExito = signal<string | null>(null);
  readonly naveSeleccionada = signal<Nave | null>(null);
  observacionesGenerales: string = '';

  // Lista de 10 puntos críticos de supervisión en invernaderos
  readonly itemsChecklist = signal<ItemChecklist[]>([
    {
      id: 'SAN-01',
      categoria: 'SANIDAD',
      titulo: 'Monitoreo de Plagas Críticas',
      descripcion: 'Inspección de envés foliar: descartar presencia de mosquita blanca, trips, pulgones y ácaros.',
      estado: 'CONFORME'
    },
    {
      id: 'SAN-02',
      categoria: 'SANIDAD',
      titulo: 'Sanidad Fúngica y Bacteriológica',
      descripcion: 'Descartar focos activos de Botrytis cinerea, Oidio, Tizón o pudriciones basales en tallo y frutos.',
      estado: 'CONFORME'
    },
    {
      id: 'SAN-03',
      categoria: 'SANIDAD',
      titulo: 'Estado de Trampas Cromáticas',
      descripcion: 'Placas adhesivas amarillas (mosquitas) y azules (trips) limpias, activas y a la altura del dosel vegetal.',
      estado: 'CONFORME'
    },
    {
      id: 'RIE-01',
      categoria: 'RIEGO',
      titulo: 'Líneas de Goteo y Emisores',
      descripcion: 'Mangueras sin estrangulamientos y goteros autocompensados limpios, sin obturación de sales ni sarro.',
      estado: 'CONFORME'
    },
    {
      id: 'RIE-02',
      categoria: 'RIEGO',
      titulo: 'Presión Hidráulica y Estanqueidad',
      descripcion: 'Presión de servicio en cabezal uniforme y ausencia total de filtraciones o roturas en uniones y llaves.',
      estado: 'CONFORME'
    },
    {
      id: 'RIE-03',
      categoria: 'RIEGO',
      titulo: 'Humedad en Bulbo Húmedo / Camellón',
      descripcion: 'Humedad uniforme en el sustrato al tacto en los primeros 15 cm sin encharcamientos ni zonas resecas.',
      estado: 'CONFORME'
    },
    {
      id: 'EST-01',
      categoria: 'ESTRUCTURA',
      titulo: 'Integridad de Polietileno / Cubierta',
      descripcion: 'Plástico térmico tensado, limpio, sin perforaciones ni desgarros que permitan entrada de lluvia.',
      estado: 'CONFORME'
    },
    {
      id: 'EST-02',
      categoria: 'ESTRUCTURA',
      titulo: 'Mallas Laterales y Cortinas Cenitales',
      descripcion: 'Malla anti-áfidos intacta y cortinas mecánicas operativas con apertura y cierre suave para ventilación.',
      estado: 'CONFORME'
    },
    {
      id: 'MAN-01',
      categoria: 'MANEJO',
      titulo: 'Desbrote, Deshoje y Entutorado',
      descripcion: 'Poda de chupones laterales al día, hojas senescentes retiradas y plantas guiadas verticalmente con hilo tutor.',
      estado: 'CONFORME'
    },
    {
      id: 'BIO-01',
      categoria: 'BIOSEGURIDAD',
      titulo: 'Higiene de Pasillos y Pediluvios',
      descripcion: 'Pasillos libres de malezas y rastrojos; bandeja pediluvio de acceso con solución desinfectante activa.',
      estado: 'CONFORME'
    }
  ]);

  constructor() {
    // Selecciona automáticamente la primera nave cuando se cargan desde Supabase
    effect(() => {
      const naves = this.erpService.naves();
      if (!this.naveSeleccionada() && naves.length > 0) {
        this.naveSeleccionada.set(naves[0]);
      }
    });
  }

  inicializarNaves(): void {
    this.erpService.sembrarNavesBase().subscribe({
      next: (res) => {
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
        }
      }
    });
  }

  seleccionarNave(nave: Nave): void {
    this.naveSeleccionada.set(nave);
    this.mensajeExito.set(null);
  }

  getVariedadNave(idNave: number): string {
    const ciclo = this.erpService.ciclos().find((c) => c.id_nave === idNave && c.estado === 'ACTIVO');
    return ciclo ? `${ciclo.variedad} (${ciclo.temporada})` : 'Sin ciclo activo';
  }

  cambiarEstadoItem(item: ItemChecklist, nuevoEstado: 'CONFORME' | 'OBSERVADO' | 'NO_CONFORME'): void {
    this.itemsChecklist.update((lista) =>
      lista.map((i) => (i.id === item.id ? { ...i, estado: nuevoEstado } : i))
    );
  }

  marcarTodoConforme(): void {
    this.itemsChecklist.update((lista) =>
      lista.map((i) => ({ ...i, estado: 'CONFORME' }))
    );
  }

  reiniciarPauta(): void {
    this.marcarTodoConforme();
    this.observacionesGenerales = '';
  }

  totalConforme(): number {
    return this.itemsChecklist().filter((i) => i.estado === 'CONFORME').length;
  }

  totalObservado(): number {
    return this.itemsChecklist().filter((i) => i.estado === 'OBSERVADO').length;
  }

  totalNoConforme(): number {
    return this.itemsChecklist().filter((i) => i.estado === 'NO_CONFORME').length;
  }

  totalVerificados(): number {
    return this.itemsChecklist().filter((i) => i.estado !== 'PENDIENTE').length;
  }

  porcentajeCumplimiento(): number {
    const total = this.itemsChecklist().length;
    if (total === 0) return 100;
    const conforme = this.totalConforme();
    const observado = this.totalObservado();
    // Los conformes valen 100%, observados 50%, no conformes 0%
    const puntaje = (conforme * 100) + (observado * 50);
    return Math.round(puntaje / total);
  }

  guardarInspeccion(): void {
    const nave = this.naveSeleccionada();
    if (!nave) return;

    const inspector = this.authService.currentUser()?.nombre_completo || 'Agrónomo de Terreno';
    const cumplimiento = this.porcentajeCumplimiento();

    let estadoGen: 'APROBADO' | 'CON_OBSERVACIONES' | 'CRITICO' = 'APROBADO';
    if (this.totalNoConforme() > 0 || cumplimiento < 70) {
      estadoGen = 'CRITICO';
    } else if (this.totalObservado() > 0 || cumplimiento < 90) {
      estadoGen = 'CON_OBSERVACIONES';
    }

    const fechaHoy = new Date();
    const fechaStr = fechaHoy.toISOString().split('T')[0] + ' ' + fechaHoy.toTimeString().substring(0, 5);

    this.erpService.registrarInspeccion({
      id_nave: nave.id_nave,
      codigo_nave: nave.codigo_nave,
      nombre_nave: nave.nombre,
      variedad_cultivo: this.getVariedadNave(nave.id_nave),
      fecha_inspeccion: fechaStr,
      inspector: inspector,
      porcentaje_cumplimiento: cumplimiento,
      estado_general: estadoGen,
      observaciones: this.observacionesGenerales.trim() || undefined,
      total_conforme: this.totalConforme(),
      total_observado: this.totalObservado(),
      total_no_conforme: this.totalNoConforme()
    });

    this.mensajeExito.set(`Inspección de ${nave.codigo_nave} registrada exitosamente (${cumplimiento}% de cumplimiento).`);
    this.observacionesGenerales = '';
  }

  getClaseEstadoNave(estado: string): string {
    switch (estado) {
      case 'EN_CULTIVO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPONIBLE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANTENCION': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  getClaseContenedorItem(estado: string): string {
    switch (estado) {
      case 'CONFORME': return 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300';
      case 'OBSERVADO': return 'bg-amber-50/50 border-amber-300 hover:border-amber-400';
      case 'NO_CONFORME': return 'bg-rose-50/50 border-rose-300 hover:border-rose-400';
      default: return 'bg-slate-50 border-slate-200';
    }
  }

  getClaseCategoria(cat: string): string {
    switch (cat) {
      case 'SANIDAD': return 'bg-emerald-100 text-emerald-800';
      case 'RIEGO': return 'bg-blue-100 text-blue-800';
      case 'ESTRUCTURA': return 'bg-indigo-100 text-indigo-800';
      case 'MANEJO': return 'bg-teal-100 text-teal-800';
      case 'BIOSEGURIDAD': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getBadgeEstadoGeneral(estado: string): string {
    switch (estado) {
      case 'APROBADO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CON_OBSERVACIONES': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'CRITICO': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }
}
