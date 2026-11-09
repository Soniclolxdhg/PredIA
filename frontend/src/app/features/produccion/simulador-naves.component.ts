import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Estructura de datos para modelar cada invernadero (nave) y su instrumental
 */
export interface NaveSimulada {
  id: number;
  codigo: string;
  nombre: string;
  cultivo: string;
  superficie: number;
  estado: 'EN_CULTIVO' | 'DISPONIBLE' | 'MANTENCION';
  // Variables de medición de sensores ambientales
  temperatura: number;
  humedad: number;
  radiacion: number;
  co2?: number;
  ec?: number;
  // Estado de los equipos mecánicos y solenoides
  riegoActivo: boolean;
  cortinasAbiertas: boolean;
  ventilacionActiva: boolean;
  nebulizacionActiva: boolean;
}

/**
 * Componente del Simulador de Invernaderos y Telemetría.
 * Permite supervisar los parámetros microclimáticos de las naves en tiempo real
 * y accionar de forma remota los sistemas de riego, ventilación y cortinas.
 */
@Component({
  selector: 'app-simulador-naves',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto pb-12">
      <!-- Panel de control de invernaderos y microclima -->
      <div class="bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-emerald-700/40">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold tracking-wide uppercase mb-2 border border-emerald-400/30">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Supervisión de Microclima &bull; Santa Laura Ltda.
            </div>
            <h1 class="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <span>📱</span>
              <span>Simulador de Naves e Invernaderos</span>
            </h1>
            <p class="text-xs sm:text-sm text-emerald-100 mt-1">
              Supervisión en vivo de microclima y control remoto de actuadores (electroválvulas de riego, ventilación y cortinas).
            </p>
          </div>

          <!-- Acciones rápidas: actualización de sensores y riego general -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              (click)="simularLecturaSensores()"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all touch-target">
              <span>⚡</span>
              <span>Simular Lectura de Sensores</span>
            </button>

            <button
              type="button"
              (click)="conmutarRiegoGlobal()"
              class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-sm rounded-xl border border-white/20 transition-all touch-target">
              <span>💧</span>
              <span>{{ todoRiegoActivo() ? 'Detener Todo Riego' : 'Activar Riego General' }}</span>
            </button>
          </div>
        </div>

        <!-- Estado de conexión de los nodos de comunicación -->
        <div class="mt-4 pt-3 border-t border-emerald-800/80 flex flex-wrap items-center justify-between text-xs text-emerald-200/90 gap-2 font-mono">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Gateway Finca Santa Laura: <strong>EN LÍNEA (915 MHz)</strong></span>
          </div>
          <div>Última actualización: <strong>{{ ultimaActualizacion() | date:'HH:mm:ss' }}</strong></div>
        </div>
      </div>

      <!-- Filtro por nave individual o vista consolidada -->
      <div class="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          (click)="naveSeleccionadaId.set(0)"
          [class]="naveSeleccionadaId() === 0 ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
          class="px-4 py-3 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors touch-target">
          🏡 Ver Todas las Naves (4)
        </button>

        <button
          *ngFor="let n of naves()"
          type="button"
          (click)="naveSeleccionadaId.set(n.id)"
          [class]="naveSeleccionadaId() === n.id ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'"
          class="px-4 py-3 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors touch-target flex items-center gap-1.5">
          <span>{{ n.codigo }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            [class]="naveSeleccionadaId() === n.id ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-600'">
            {{ n.temperatura }}°C
          </span>
        </button>
      </div>

      <!-- Tarjetas de supervisión por cada invernadero -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          *ngFor="let nave of navesFiltradas()"
          class="bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-400 p-5 sm:p-6 shadow-xs transition-all flex flex-col justify-between">
          <div>
            <!-- Información general y variedad plantada -->
            <div class="flex items-start justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                    {{ nave.codigo }}
                  </span>
                  <h2 class="text-lg font-black text-slate-900">{{ nave.nombre }}</h2>
                </div>
                <div class="text-xs text-slate-500 font-semibold mt-1">
                  Variedad: <span class="text-emerald-700 font-bold">{{ nave.cultivo }}</span> &bull; {{ nave.superficie }} m²
                </div>
              </div>

              <span [class]="getClaseEstadoNave(nave.estado)" class="text-xs font-black px-2.5 py-1 rounded-full border">
                {{ nave.estado }}
              </span>
            </div>

            <!-- Lecturas de temperatura, humedad y radiación -->
            <div class="grid grid-cols-3 gap-2.5 mb-5">
              <!-- Temperatura interior -->
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Temperatura</div>
                <div class="text-xl sm:text-2xl font-black mt-0.5" [class]="nave.temperatura > 26 ? 'text-rose-600' : (nave.temperatura < 15 ? 'text-blue-600' : 'text-emerald-700')">
                  {{ nave.temperatura }}°C
                </div>
                <div class="text-[10px] text-slate-400">Óptimo: 18-25°C</div>
              </div>

              <!-- Humedad relativa -->
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Humedad Rel.</div>
                <div class="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                  {{ nave.humedad }}%
                </div>
                <div class="text-[10px] text-slate-400">HR Invernadero</div>
              </div>

              <!-- Radiación solar / Conductividad eléctrica -->
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {{ nave.ec ? 'Conduct. EC' : 'Radiación' }}
                </div>
                <div class="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                  {{ nave.ec ? nave.ec + ' mS' : nave.radiacion + ' W/m²' }}
                </div>
                <div class="text-[10px] text-slate-400">{{ nave.ec ? 'Solución Nutritiva' : 'Sensor Piranómetro' }}</div>
              </div>
            </div>

            <!-- Controles manuales de actuadores -->
            <div class="space-y-2.5">
              <div class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Controles de Actuadores en Terreno</span>
                <span class="text-[10px] text-emerald-700 font-mono font-bold">1-Toque Táctil</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <!-- Electroválvula de riego -->
                <button
                  type="button"
                  (click)="alternarRiego(nave)"
                  [class]="nave.riegoActivo ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'"
                  class="p-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all touch-target">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">💧</span>
                    <div class="text-left">
                      <div>Riego por Goteo</div>
                      <div class="text-[10px] font-normal" [class]="nave.riegoActivo ? 'text-blue-100' : 'text-slate-500'">Válvula Solenoide #{{ nave.id }}</div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-md font-mono" [class]="nave.riegoActivo ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-700'">
                    {{ nave.riegoActivo ? 'ACTIVO' : 'OFF' }}
                  </span>
                </button>

                <!-- Cortinas térmicas cenitales -->
                <button
                  type="button"
                  (click)="alternarCortinas(nave)"
                  [class]="nave.cortinasAbiertas ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'"
                  class="p-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all touch-target">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🌤️</span>
                    <div class="text-left">
                      <div>Cortinas Cenitales</div>
                      <div class="text-[10px] font-normal" [class]="nave.cortinasAbiertas ? 'text-emerald-100' : 'text-slate-500'">Motor Reductor 24V</div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-md font-mono" [class]="nave.cortinasAbiertas ? 'bg-emerald-900 text-white' : 'bg-slate-300 text-slate-700'">
                    {{ nave.cortinasAbiertas ? 'ABIERTAS' : 'CERRADAS' }}
                  </span>
                </button>

                <!-- Ventilación forzada con extractores -->
                <button
                  type="button"
                  (click)="alternarVentilacion(nave)"
                  [class]="nave.ventilacionActiva ? 'bg-teal-700 text-white border-teal-800 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'"
                  class="p-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all touch-target">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">💨</span>
                    <div class="text-left">
                      <div>Ventilación Forzada</div>
                      <div class="text-[10px] font-normal" [class]="nave.ventilacionActiva ? 'text-teal-100' : 'text-slate-500'">Extractores Eólicos</div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-md font-mono" [class]="nave.ventilacionActiva ? 'bg-teal-900 text-white' : 'bg-slate-300 text-slate-700'">
                    {{ nave.ventilacionActiva ? 'ON' : 'OFF' }}
                  </span>
                </button>

                <!-- Nebulización para control de heladas -->
                <button
                  type="button"
                  (click)="alternarNebulizacion(nave)"
                  [class]="nave.nebulizacionActiva ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'"
                  class="p-3.5 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-between transition-all touch-target">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">🌫️</span>
                    <div class="text-left">
                      <div>Nebulización Antihelada</div>
                      <div class="text-[10px] font-normal" [class]="nave.nebulizacionActiva ? 'text-cyan-100' : 'text-slate-500'">Microaspersores de techo</div>
                    </div>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-md font-mono" [class]="nave.nebulizacionActiva ? 'bg-cyan-900 text-white' : 'bg-slate-300 text-slate-700'">
                    {{ nave.nebulizacionActiva ? 'ON' : 'OFF' }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Pie informativo del nodo de telemetría -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Nodo Sensor: ESP32-NV{{ nave.id }}</span>
            <span class="text-emerald-700 font-bold">Batería Solar: 98% 🔋</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SimuladorNavesComponent {
  // Nave seleccionada para el filtro (0 = ver todas)
  readonly naveSeleccionadaId = signal<number>(0);

  // Registro de la última fecha y hora de recepción de telemetría
  readonly ultimaActualizacion = signal<Date>(new Date());

  // Estado reactivo que contiene la información y parámetros de las 4 naves de Santa Laura Ltda.
  readonly naves = signal<NaveSimulada[]>([
    {
      id: 1,
      codigo: 'NV-01',
      nombre: 'Nave 1 &bull; Tomates Larga Vida',
      cultivo: 'Tomate Larga Vida (Ciclo Activo #1)',
      superficie: 2500,
      estado: 'EN_CULTIVO',
      temperatura: 23.4,
      humedad: 71,
      radiacion: 640,
      co2: 440,
      riegoActivo: true,
      cortinasAbiertas: true,
      ventilacionActiva: false,
      nebulizacionActiva: false
    },
    {
      id: 2,
      codigo: 'NV-02',
      nombre: 'Nave 2 &bull; Pimientos Holandeses',
      cultivo: 'Pimiento Morrón Rojo (Ciclo Activo #2)',
      superficie: 2000,
      estado: 'EN_CULTIVO',
      temperatura: 21.8,
      humedad: 68,
      radiacion: 580,
      ec: 2.2,
      riegoActivo: false,
      cortinasAbiertas: true,
      ventilacionActiva: true,
      nebulizacionActiva: false
    },
    {
      id: 3,
      codigo: 'NV-03',
      nombre: 'Nave 3 &bull; Propagación & Almácigos',
      cultivo: 'Almácigos Tomate / Lechuga',
      superficie: 1800,
      estado: 'DISPONIBLE',
      temperatura: 24.1,
      humedad: 82,
      radiacion: 420,
      co2: 480,
      riegoActivo: false,
      cortinasAbiertas: false,
      ventilacionActiva: false,
      nebulizacionActiva: false
    },
    {
      id: 4,
      codigo: 'NV-04',
      nombre: 'Nave 4 &bull; Hortalizas de Hoja',
      cultivo: 'En mantención de policarbonato',
      superficie: 1500,
      estado: 'MANTENCION',
      temperatura: 19.5,
      humedad: 58,
      radiacion: 510,
      riegoActivo: false,
      cortinasAbiertas: false,
      ventilacionActiva: false,
      nebulizacionActiva: false
    }
  ]);

  /**
   * Retorna la lista de naves aplicando el filtro activo (todas o una específica)
   */
  navesFiltradas(): NaveSimulada[] {
    const idSel = this.naveSeleccionadaId();
    if (idSel === 0) return this.naves();
    return this.naves().filter((n) => n.id === idSel);
  }

  /**
   * Determina si el sistema de riego por goteo se encuentra activo en la totalidad de las naves
   */
  todoRiegoActivo(): boolean {
    return this.naves().every((n) => n.riegoActivo);
  }

  /**
   * Enciende o apaga las electroválvulas de riego en todas las naves simultáneamente
   */
  conmutarRiegoGlobal(): void {
    const nuevoEstado = !this.todoRiegoActivo();
    this.naves.update((lista) =>
      lista.map((n) => ({ ...n, riegoActivo: nuevoEstado }))
    );
  }

  /**
   * Alterna el estado de la electroválvula de riego por goteo en la nave seleccionada
   */
  alternarRiego(nave: NaveSimulada): void {
    this.actualizarNave(nave.id, { riegoActivo: !nave.riegoActivo });
  }

  /**
   * Abre o cierra las cortinas cenitales automáticas para ventilación pasiva y control térmico
   */
  alternarCortinas(nave: NaveSimulada): void {
    this.actualizarNave(nave.id, { cortinasAbiertas: !nave.cortinasAbiertas });
  }

  /**
   * Enciende o detiene la ventilación mecánica forzada para extraer excesos de calor y humedad
   */
  alternarVentilacion(nave: NaveSimulada): void {
    this.actualizarNave(nave.id, { ventilacionActiva: !nave.ventilacionActiva });
  }

  /**
   * Activa o desactiva la micro-nebulización para humectación y prevención de daños por heladas
   */
  alternarNebulizacion(nave: NaveSimulada): void {
    this.actualizarNave(nave.id, { nebulizacionActiva: !nave.nebulizacionActiva });
  }

  /**
   * Aplica cambios parciales a una nave específica dentro de la señal reactiva
   */
  private actualizarNave(id: number, cambios: Partial<NaveSimulada>): void {
    this.naves.update((lista) =>
      lista.map((n) => (n.id === id ? { ...n, ...cambios } : n))
    );
  }

  /**
   * Simula fluctuaciones naturales de microclima (+/- 0.8°C y +/- 3% humedad)
   * para evidenciar en tiempo real el comportamiento dinámico de los sensores
   */
  simularLecturaSensores(): void {
    this.naves.update((lista) =>
      lista.map((n) => {
        // Cálculo de variación delta dentro de rangos agronómicos lógicos
        const deltaTemp = (Math.random() * 1.6 - 0.8);
        const deltaHum = Math.round(Math.random() * 6 - 3);
        const deltaRad = Math.round(Math.random() * 40 - 20);

        const nuevaTemp = Math.round((n.temperatura + deltaTemp) * 10) / 10;
        const nuevaHum = Math.min(95, Math.max(35, n.humedad + deltaHum));
        const nuevaRad = Math.max(100, n.radiacion + deltaRad);

        return {
          ...n,
          temperatura: nuevaTemp,
          humedad: nuevaHum,
          radiacion: nuevaRad
        };
      })
    );
    this.ultimaActualizacion.set(new Date());
  }

  /**
   * Asigna estilos y colores a la insignia de estado según el ciclo de la nave
   */
  getClaseEstadoNave(estado: string): string {
    switch (estado) {
      case 'EN_CULTIVO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPONIBLE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANTENCION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  }
}
