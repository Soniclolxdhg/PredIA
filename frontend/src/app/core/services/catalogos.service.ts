import { Injectable, inject, signal, computed } from '@angular/core';
import { ErpDataService } from './erp-data.service';
import { Observable, of } from 'rxjs';

export interface CatalogoEstructura {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  navesEnUso: number;
}

export interface CatalogoVariedad {
  id: string;
  nombre: string;
  especie: string;
  codigoRef: string;
  activo: boolean;
  ciclosEnUso: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogosService {
  private readonly erpService = inject(ErpDataService);

  // Lista base de estructuras reconocidas en la operación
  private readonly estructurasBase = signal<Array<Omit<CatalogoEstructura, 'navesEnUso'>>>([
    { id: 'EST-01', nombre: 'Multitúnel Metal', descripcion: 'Estructura metálica galvanizada con cubierta de polietileno térmico.', activo: true },
    { id: 'EST-02', nombre: 'Túnel Simple', descripcion: 'Túnel semicircular individual para cultivos de temporada.', activo: true },
    { id: 'EST-03', nombre: 'Invernadero Climatizado', descripcion: 'Control computarizado de ventilación cenital y microclima.', activo: true },
    { id: 'EST-04', nombre: 'Sombreadero Malla Raschel', descripcion: 'Estructura de sombreo al 50-70% para control de radiación.', activo: true },
    { id: 'EST-05', nombre: 'Capilla Tradicional', descripcion: 'Diseño a dos aguas con ventilación lateral manual.', activo: true }
  ]);

  // Lista base de variedades agrícolas de Santa Laura Ltda.
  private readonly variedadesBase = signal<Array<Omit<CatalogoVariedad, 'ciclosEnUso'>>>([
    { id: 'VAR-01', nombre: 'Tomate Larga Vida', especie: 'Solanum lycopersicum', codigoRef: 'SEM-TOM-01', activo: true },
    { id: 'VAR-02', nombre: 'Pimiento Cuadrado Rojo', especie: 'Capsicum annuum', codigoRef: 'SEM-PIM-01', activo: true },
    { id: 'VAR-03', nombre: 'Hortalizas de Hoja Protegidas', especie: 'Lactuca sativa / Varias', codigoRef: 'SEM-HOR-01', activo: true }
  ]);

  // Estructuras computadas integrando el conteo de naves en uso en tiempo real
  readonly estructuras = computed<CatalogoEstructura[]>(() => {
    const naves = this.erpService.naves();
    return this.estructurasBase().map((est) => ({
      ...est,
      navesEnUso: naves.filter((n) => n.tipo_estructura.toLowerCase() === est.nombre.toLowerCase()).length
    }));
  });

  // Variedades computadas integrando el conteo de ciclos en uso en tiempo real
  readonly variedades = computed<CatalogoVariedad[]>(() => {
    const ciclos = this.erpService.ciclos();
    return this.variedadesBase().map((v) => ({
      ...v,
      ciclosEnUso: ciclos.filter((c) => c.variedad.toLowerCase().includes(v.nombre.toLowerCase())).length
    }));
  });

  /**
   * Intenta registrar una nueva estructura en el catálogo.
   * Documenta honestamente si el endpoint de backend no existe.
   */
  crearEstructura(nombre: string, descripcion: string): Observable<{ exito: boolean; mensaje: string }> {
    console.warn('⚠️ [CatalogosService] Endpoint POST /api/catalogos/estructuras pendiente de implementación en backend.');
    return of({
      exito: false,
      mensaje: "⚠️ El endpoint 'POST /api/catalogos/estructuras' aún no está implementado en el backend NestJS. No se simuló la persistencia."
    });
  }

  /**
   * Intenta registrar una nueva variedad en el catálogo.
   */
  crearVariedad(nombre: string, especie: string, codigoRef: string): Observable<{ exito: boolean; mensaje: string }> {
    console.warn('⚠️ [CatalogosService] Endpoint POST /api/catalogos/variedades pendiente de implementación en backend.');
    return of({
      exito: false,
      mensaje: "⚠️ El endpoint 'POST /api/catalogos/variedades' aún no está implementado en el backend NestJS. No se simuló la persistencia."
    });
  }

  /**
   * Intenta desactivar una estructura del catálogo.
   */
  desactivarEstructura(id: string): Observable<{ exito: boolean; mensaje: string }> {
    const est = this.estructuras().find((e) => e.id === id);
    if (est && est.navesEnUso > 0) {
      return of({
        exito: false,
        mensaje: `No es posible eliminar o desactivar '${est.nombre}': está asociada a ${est.navesEnUso} nave(s) activa(s).`
      });
    }

    return of({
      exito: false,
      mensaje: "⚠️ El endpoint 'PATCH /api/catalogos/estructuras/:id' aún no está implementado en el backend NestJS."
    });
  }

  /**
   * Intenta desactivar una variedad del catálogo.
   */
  desactivarVariedad(id: string): Observable<{ exito: boolean; mensaje: string }> {
    const v = this.variedades().find((item) => item.id === id);
    if (v && v.ciclosEnUso > 0) {
      return of({
        exito: false,
        mensaje: `No es posible eliminar o desactivar '${v.nombre}': tiene historial de ${v.ciclosEnUso} ciclo(s) agrícola(s).`
      });
    }

    return of({
      exito: false,
      mensaje: "⚠️ El endpoint 'PATCH /api/catalogos/variedades/:id' aún no está implementado en el backend NestJS."
    });
  }
}
