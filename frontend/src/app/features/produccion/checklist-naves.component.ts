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
  templateUrl: './checklist-naves.component.html'
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
    console.log('📤 [POST /produccion/naves/sembrar] Sembrando naves desde Checklist...');
    this.erpService.sembrarNavesBase().subscribe({
      next: (res) => {
        console.log('📥 [POST /produccion/naves/sembrar] Respuesta recibida:', res);
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

    const inspeccionData = {
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
    };

    console.log('📤 [POST Guardar Inspección de Nave] Registrando inspección técnica:', inspeccionData);

    this.erpService.registrarInspeccion(inspeccionData);

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
