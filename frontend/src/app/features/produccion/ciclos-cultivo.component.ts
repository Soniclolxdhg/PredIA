import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { Nave } from '../../core/models/erp.models';
import { CrearNaveDto, CrearCicloDto } from '../../core/models/dtos';

/**
 * Validador para asegurar que la fecha de término estimada sea posterior a la de inicio
 */
function fechaTerminoPosteriorValidator(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fecha_inicio')?.value;
  const termino = group.get('fecha_termino_estimada')?.value;
  if (!inicio || !termino) return null;
  return new Date(termino) > new Date(inicio) ? null : { fechaTerminoNoPosterior: true };
}

/**
 * Componente para la gestión de Ciclos de Cultivo e Invernaderos (HU01).
 * Controla la creación de naves y la apertura de ciclos agrícolas,
 * conectado en tiempo real con PostgreSQL en Supabase a través del backend NestJS.
 */
@Component({
  selector: 'app-ciclos-cultivo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ciclos-cultivo.component.html'
})
export class CiclosCultivoComponent implements OnInit {
  // Inyección de servicios centrales
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  // Señales reactivas para ventanas modales y estado
  readonly modalCicloVisible = signal(false);
  readonly modalNaveVisible = signal(false);
  readonly guardandoCiclo = signal(false);
  readonly guardandoNave = signal(false);
  readonly sembrando = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);

  // Formulario reactivo para la creación de nueva Nave (código asignado de solo lectura)
  readonly naveForm: FormGroup = this.fb.group({
    codigo_nave: [{ value: '', disabled: false }, [Validators.required, Validators.minLength(3)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    superficie_m2: [2500, [Validators.required, Validators.min(10)]],
    tipo_estructura: ['Multitúnel Metal', [Validators.required]]
  });

  // Formulario reactivo para la apertura del ciclo productivo con validación de fechas
  readonly cicloForm: FormGroup = this.fb.group(
    {
      id_nave: ['', [Validators.required]],
      temporada: ['PRIMAVERA_2026', [Validators.required]],
      variedad: ['', [Validators.required, Validators.minLength(3)]],
      fecha_inicio: [new Date().toISOString().split('T')[0], [Validators.required]],
      fecha_termino_estimada: ['', [Validators.required]]
    },
    { validators: [fechaTerminoPosteriorValidator] }
  );

  /**
   * Cierre accesible de ventanas modales con tecla Escape
   */
  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.modalCicloVisible()) this.cerrarModalCiclo();
    if (this.modalNaveVisible()) this.cerrarModalNave();
  }

  ngOnInit(): void {
    this.recargarDatos();
  }

  /**
   * Carga o actualiza tanto las naves como los ciclos directamente desde Supabase
   */
  recargarDatos(): void {
    this.mensajeError.set(null);
    this.erpService.cargarNaves().subscribe({
      next: () => this.ultimaActualizacion.set(new Date()),
      error: () => this.mensajeError.set('Error al sincronizar naves con el servidor.')
    });
    this.erpService.cargarCiclos().subscribe({
      next: () => this.ultimaActualizacion.set(new Date()),
      error: () => this.mensajeError.set('Error al sincronizar ciclos con el servidor.')
    });
  }

  /**
   * Calcula la superficie total acumulada sumando los metros cuadrados de todas las naves
   */
  get totalSuperficie(): number {
    return this.erpService.naves().reduce((acc, n) => acc + n.superficie_m2, 0);
  }

  /**
   * Busca y retorna el nombre y código de la nave a partir de su ID
   */
  getNaveNombre(idNave: number): string {
    const nave = this.erpService.naves().find((n) => n.id_nave === idNave);
    return nave ? `${nave.nombre} (${nave.codigo_nave})` : `Nave #${idNave}`;
  }

  /**
   * Retorna las clases visuales de Tailwind según el estado de la nave
   */
  getClaseEstadoNave(estado: string): string {
    switch (estado) {
      case 'EN_CULTIVO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DISPONIBLE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANTENCION': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  /**
   * Siembra las 4 naves base de Santa Laura Ltda. en Supabase si la tabla está vacía
   */
  sembrarNaves(): void {
    console.log('📤 [POST /produccion/naves/sembrar] Sembrando 4 naves base de Santa Laura Ltda. en Supabase...');
    this.sembrando.set(true);
    this.mensajeError.set(null);

    this.erpService.sembrarNavesBase().subscribe({
      next: (res) => {
        this.sembrando.set(false);
        console.log('📥 [POST /produccion/naves/sembrar] Respuesta recibida:', res);
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
          this.recargarDatos();
        } else {
          this.mensajeError.set(res.mensaje);
        }
      },
      error: (err) => {
        this.sembrando.set(false);
        console.error('❌ [POST /produccion/naves/sembrar] Error:', err);
        this.mensajeError.set('No fue posible conectar con el servidor para inicializar naves.');
      }
    });
  }

  // ==========================================
  // GESTIÓN MODAL: CREAR NAVE (HU01)
  // ==========================================

  abrirModalNave(): void {
    // Generación de código sugerido de solo lectura para cumplir con DTO del backend
    const totalActual = this.erpService.naves().length;
    const proxNum = totalActual + 1;
    const codSugerido = `NAV-${proxNum < 10 ? '0' + proxNum : proxNum}`;

    this.naveForm.reset({
      codigo_nave: codSugerido,
      nombre: `Nave ${proxNum} - Invernadero`,
      superficie_m2: 2500,
      tipo_estructura: 'Multitúnel Metal'
    });
    this.mensajeError.set(null);
    this.modalNaveVisible.set(true);
  }

  cerrarModalNave(): void {
    this.modalNaveVisible.set(false);
  }

  onSubmitNave(): void {
    if (this.naveForm.invalid) {
      this.naveForm.markAllAsTouched();
      return;
    }

    const val = this.naveForm.getRawValue();
    const dto: CrearNaveDto = {
      codigoNave: String(val.codigo_nave).trim().toUpperCase(),
      nombre: String(val.nombre).trim(),
      superficieM2: Number(val.superficie_m2),
      tipoEstructura: String(val.tipo_estructura)
    };

    console.log('📤 [POST Botón Guardar Nave] Enviando DTO CrearNave a la API:', dto);

    this.guardandoNave.set(true);
    this.mensajeError.set(null);

    this.erpService.crearNave(dto).subscribe({
      next: (res) => {
        this.guardandoNave.set(false);
        console.log('📥 [POST Botón Guardar Nave] Respuesta recibida:', res);
        if (!res.exito) {
          this.mensajeError.set(res.mensaje);
        } else {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalNave();
          this.recargarDatos();
        }
      },
      error: (err) => {
        this.guardandoNave.set(false);
        console.error('❌ [POST Botón Guardar Nave] Error al enviar DTO:', err);
        this.mensajeError.set('Error inesperado al conectar con Supabase para registrar la nave.');
      }
    });
  }

  // ==========================================
  // GESTIÓN MODAL: APERTURAR CICLO (HU01)
  // ==========================================

  abrirModalCiclo(): void {
    this.cicloForm.reset({
      id_nave: '',
      temporada: 'PRIMAVERA_2026',
      variedad: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_termino_estimada: ''
    });
    this.mensajeError.set(null);
    this.modalCicloVisible.set(true);
  }

  cerrarModalCiclo(): void {
    this.modalCicloVisible.set(false);
  }

  seleccionarVariedadPredefinida(variedad: string): void {
    this.cicloForm.patchValue({ variedad });
  }

  onSubmitCiclo(): void {
    if (this.cicloForm.invalid) {
      this.cicloForm.markAllAsTouched();
      return;
    }

    const val = this.cicloForm.getRawValue();
    const dto: CrearCicloDto = {
      idNave: Number(val.id_nave),
      temporada: val.temporada,
      variedad: String(val.variedad).trim(),
      fechaInicio: val.fecha_inicio,
      fechaTerminoEstimada: val.fecha_termino_estimada || undefined
    };

    console.log('📤 [POST Botón Aperturar Ciclo] Enviando DTO CrearCiclo a la API:', dto);

    this.guardandoCiclo.set(true);
    this.mensajeError.set(null);

    this.erpService.crearCicloCultivo(dto).subscribe({
      next: (res) => {
        this.guardandoCiclo.set(false);
        console.log('📥 [POST Botón Aperturar Ciclo] Respuesta recibida:', res);
        if (!res.exito) {
          this.mensajeError.set(res.mensaje);
        } else {
          this.mensajeExito.set(res.mensaje);
          this.cerrarModalCiclo();
          this.recargarDatos();
        }
      },
      error: (err) => {
        this.guardandoCiclo.set(false);
        console.error('❌ [POST Botón Aperturar Ciclo] Error al enviar DTO:', err);
        this.mensajeError.set('Error inesperado de comunicación con la base de datos de Supabase.');
      }
    });
  }
}
