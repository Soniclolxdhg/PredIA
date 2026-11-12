import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogosService, CatalogoEstructura, CatalogoVariedad } from '../../core/services/catalogos.service';

/**
 * Componente Mantenedor de Catálogos Administrativos (Estructuras de Naves y Variedades Agrícolas).
 * Acceso exclusivo para perfil ADMINISTRADOR.
 * Sincronizado con datos reales de la operación y con advertencias explícitas de endpoints pendientes.
 */
@Component({
  selector: 'app-admin-catalogos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogos.component.html'
})
export class CatalogosComponent {
  readonly catalogosService = inject(CatalogosService);
  private readonly fb = inject(FormBuilder);

  readonly pestanaActiva = signal<'ESTRUCTURAS' | 'VARIEDADES'>('ESTRUCTURAS');
  readonly busqueda = signal<string>('');

  readonly modalEstructuraAbierto = signal<boolean>(false);
  readonly modalVariedadAbierto = signal<boolean>(false);

  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);

  readonly estructuraForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(5)]]
  });

  readonly variedadForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    especie: ['', [Validators.required, Validators.minLength(3)]],
    codigoRef: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly estructurasFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const lista = this.catalogosService.estructuras();
    if (!q) return lista;
    return lista.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.descripcion.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    );
  });

  readonly variedadesFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const lista = this.catalogosService.variedades();
    if (!q) return lista;
    return lista.filter(
      (v) =>
        v.nombre.toLowerCase().includes(q) ||
        v.especie.toLowerCase().includes(q) ||
        v.codigoRef.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q)
    );
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarModalEstructura();
    this.cerrarModalVariedad();
  }

  cambiarPestana(p: 'ESTRUCTURAS' | 'VARIEDADES'): void {
    this.pestanaActiva.set(p);
    this.busqueda.set('');
    this.mensajeError.set(null);
  }

  abrirModalEstructura(): void {
    this.estructuraForm.reset();
    this.mensajeError.set(null);
    this.modalEstructuraAbierto.set(true);
  }

  cerrarModalEstructura(): void {
    this.modalEstructuraAbierto.set(false);
  }

  onSubmitEstructura(): void {
    if (this.estructuraForm.invalid) {
      this.estructuraForm.markAllAsTouched();
      return;
    }
    const { nombre, descripcion } = this.estructuraForm.value;
    this.catalogosService.crearEstructura(nombre, descripcion).subscribe((res) => {
      if (res.exito) {
        this.mensajeExito.set(res.mensaje);
        this.cerrarModalEstructura();
      } else {
        this.mensajeError.set(res.mensaje);
      }
    });
  }

  abrirModalVariedad(): void {
    this.variedadForm.reset();
    this.mensajeError.set(null);
    this.modalVariedadAbierto.set(true);
  }

  cerrarModalVariedad(): void {
    this.modalVariedadAbierto.set(false);
  }

  onSubmitVariedad(): void {
    if (this.variedadForm.invalid) {
      this.variedadForm.markAllAsTouched();
      return;
    }
    const { nombre, especie, codigoRef } = this.variedadForm.value;
    this.catalogosService.crearVariedad(nombre, especie, codigoRef).subscribe((res) => {
      if (res.exito) {
        this.mensajeExito.set(res.mensaje);
        this.cerrarModalVariedad();
      } else {
        this.mensajeError.set(res.mensaje);
      }
    });
  }

  desactivarEstructura(e: CatalogoEstructura): void {
    this.catalogosService.desactivarEstructura(e.id).subscribe((res) => {
      if (res.exito) {
        this.mensajeExito.set(res.mensaje);
      } else {
        this.mensajeError.set(res.mensaje);
      }
    });
  }

  desactivarVariedad(v: CatalogoVariedad): void {
    this.catalogosService.desactivarVariedad(v.id).subscribe((res) => {
      if (res.exito) {
        this.mensajeExito.set(res.mensaje);
      } else {
        this.mensajeError.set(res.mensaje);
      }
    });
  }
}
