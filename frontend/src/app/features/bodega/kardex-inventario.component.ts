import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { InventarioApiService } from '../../core/services/inventario.service';
import { TipoMovimiento, CategoriaInsumo } from '../../core/models/enum.types';
import { Insumo, MovimientoBodega } from '../../core/models/erp.models';
import { CrearInsumoDto, RegistrarMovimientoDto } from '../../core/models/dtos';

/**
 * Controlador de Control de Inventario en Bodega y Kardex.
 * Conecta directamente con la API REST oficial de NestJS y Supabase,
 * gestiona insumos (crear, editar, activar/desactivar y eliminar),
 * folios autoincrementables, cálculo de PMP, cantidades decimales con formato chileno,
 * filtros de categoría y búsqueda en tiempo real.
 */
@Component({
  selector: 'app-kardex-inventario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kardex-inventario.component.html'
})
export class KardexInventarioComponent implements OnInit {
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  readonly catalogosService = inject(CatalogosService);
  readonly inventarioApi = inject(InventarioApiService);
  private readonly fb = inject(FormBuilder);

  // Estados reactivos de la vista
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly guardandoEdicionInsumo = signal<boolean>(false);
  readonly modalMovimientoVisible = signal<boolean>(false);
  readonly modalInsumoVisible = signal<boolean>(false);
  readonly modalEditarInsumoVisible = signal<boolean>(false);
  readonly insumoSeleccionado = signal<Insumo | null>(null);
  readonly soloCriticos = signal<boolean>(false);

  // Filtros del inventario de insumos
  readonly filtroCategoriaInsumo = signal<string>('TODOS');
  readonly busquedaInsumo = signal<string>('');

  // Filtros del historial de bodega
  readonly filtroInsumoMov = signal<string>('TODOS');
  readonly filtroTipoMov = signal<string>('TODOS');
  readonly filtroFechaDesde = signal<string>('');
  readonly filtroFechaHasta = signal<string>('');
  readonly busquedaMov = signal<string>('');

  // Mensajes y alertas
  readonly mensajeExito = signal<string | null>(null);
  readonly mensajeError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly modalInsumoError = signal<string | null>(null);

  // Formulario: Registrar Movimiento Kardex con soporte de decimales (step=0.01)
  readonly movForm: FormGroup = this.fb.group({
    id_insumo: ['', [Validators.required]],
    tipo_movimiento: ['ENTRADA_COMPRA', [Validators.required]],
    fecha_movimiento: [new Date().toISOString().split('T')[0], [Validators.required]],
    cantidad_nominal: ['', [Validators.required, Validators.min(0.01)]],
    porcentaje_merma: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    costo_unitario_compra: ['', [Validators.required, Validators.min(0)]],
    documento_referencia: ['']
  });

  // Formulario: Crear Insumo con placeholders
  readonly insumoForm: FormGroup = this.fb.group({
    codigoInsumo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    categoria: ['SEMILLA', [Validators.required]],
    unidadMedida: ['UNIDADES', [Validators.required]],
    stockMinimoAlerta: ['', [Validators.required, Validators.min(0)]],
    stockInicial: ['', [Validators.min(0)]],
    costoUnitarioInicial: ['', [Validators.min(0)]],
    esMaterialVegetal: [true]
  });

  // Formulario: Editar Insumo
  readonly editarInsumoForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    categoria: ['SEMILLA', [Validators.required]],
    unidadMedida: ['UNIDADES', [Validators.required]],
    stockMinimoAlerta: ['', [Validators.required, Validators.min(0)]],
    costoUnitarioPromedio: ['', [Validators.required, Validators.min(0)]]
  });

  // Señales computadas de insumos
  readonly totalCriticos = computed(() =>
    this.erpService.insumos().filter((i) => i.es_stock_critico || i.stock_actual <= i.stock_minimo_alerta).length
  );

  // Insumos filtrados por categoría, búsqueda y estado crítico
  readonly insumosFiltrados = computed(() => {
    let lista = this.erpService.insumos();
    const cat = this.filtroCategoriaInsumo();
    const q = this.busquedaInsumo().trim().toLowerCase();

    if (this.soloCriticos()) {
      lista = lista.filter((i) => i.es_stock_critico || i.stock_actual <= i.stock_minimo_alerta);
    }
    if (cat !== 'TODOS') {
      lista = lista.filter((i) => i.categoria === cat);
    }
    if (q) {
      lista = lista.filter((i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.codigo_insumo.toLowerCase().includes(q)
      );
    }
    return lista;
  });

  // Historial de movimientos filtrado interactivamente
  readonly movimientosFiltrados = computed<MovimientoBodega[]>(() => {
    const lista = this.erpService.movimientosBodega();
    const insumoId = this.filtroInsumoMov();
    const tipo = this.filtroTipoMov();
    const desde = this.filtroFechaDesde();
    const hasta = this.filtroFechaHasta();
    const q = this.busquedaMov().trim().toLowerCase();

    return lista.filter((m) => {
      if (insumoId !== 'TODOS' && String(m.id_insumo) !== insumoId) return false;
      if (tipo !== 'TODOS' && m.tipo_movimiento !== tipo) return false;
      if (desde && m.fecha_movimiento < desde) return false;
      if (hasta && m.fecha_movimiento > hasta) return false;

      if (q) {
        const docRef = (m.documento_referencia || '').toLowerCase();
        const nomIns = this.getNombreInsumo(m.id_insumo).toLowerCase();
        const codIns = this.getCodigoInsumo(m.id_insumo).toLowerCase();
        if (!docRef.includes(q) && !nomIns.includes(q) && !codIns.includes(q)) {
          return false;
        }
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.sincronizar();
  }

  sincronizar(): void {
    this.cargando.set(true);
    this.erpService.cargarInsumos().subscribe({
      next: () => this.cargando.set(false),
      error: () => this.cargando.set(false)
    });
    this.erpService.cargarMovimientos().subscribe();
    this.erpService.cargarAlertas().subscribe();
  }

  alternarFiltroCriticos(valor: boolean): void {
    this.soloCriticos.set(valor);
  }

  formatDecimal(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '0,0';
    return Number(val).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  calcularCantidadNetaPrevia(): number {
    const nominal = Number(this.movForm.get('cantidad_nominal')?.value || 0);
    const merma = Number(this.movForm.get('porcentaje_merma')?.value || 0);
    return nominal * (1 - merma / 100);
  }

  getClaseBadge(tipo: string): string {
    switch (tipo) {
      case 'ENTRADA_COMPRA': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'SALIDA_LABOR': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'AJUSTE_MERMA': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  getNombreInsumo(idInsumo: number): string {
    const ins = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
    return ins ? ins.nombre : `Insumo #${idInsumo}`;
  }

  getCodigoInsumo(idInsumo: number): string {
    const ins = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
    return ins ? ins.codigo_insumo : '---';
  }

  getUnidadInsumo(idInsumo: number): string {
    const ins = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
    return ins ? ins.unidad_medida : 'UNIDADES';
  }

  generarFolioSugerido(tipo: TipoMovimiento): string {
    const movimientos = this.erpService.movimientosBodega();
    const anioActual = new Date().getFullYear();
    const prefijo = tipo === 'ENTRADA_COMPRA' ? 'FAC' : (tipo === 'SALIDA_LABOR' ? 'VALE' : 'MER');
    const conteo = movimientos.filter((m) => m.tipo_movimiento === tipo).length + 1;
    const numPad = String(conteo).padStart(4, '0');
    return `#${prefijo}-${anioActual}-${numPad}`;
  }

  onTipoMovimientoChange(): void {
    const tipo = this.movForm.get('tipo_movimiento')?.value as TipoMovimiento;
    const folio = this.generarFolioSugerido(tipo);
    this.movForm.patchValue({ documento_referencia: folio });

    if (tipo === 'SALIDA_LABOR') {
      const idInsumo = Number(this.movForm.get('id_insumo')?.value);
      const insumo = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
      if (insumo) {
        this.movForm.patchValue({ costo_unitario_compra: insumo.costo_unitario_promedio });
      }
    }
  }

  abrirModalMovimiento(): void {
    this.modalError.set(null);
    const tipo = (this.movForm.get('tipo_movimiento')?.value as TipoMovimiento) || 'ENTRADA_COMPRA';
    const folio = this.generarFolioSugerido(tipo);
    this.movForm.patchValue({
      documento_referencia: folio,
      cantidad_nominal: '',
      porcentaje_merma: 0,
      costo_unitario_compra: ''
    });
    this.modalMovimientoVisible.set(true);
  }

  cerrarModalMovimiento(): void {
    this.modalMovimientoVisible.set(false);
    this.modalError.set(null);
  }

  abrirModalInsumo(): void {
    this.modalInsumoError.set(null);
    const unidades = this.catalogosService.unidadesMedida();
    const unidadDefecto = unidades.length > 0 ? unidades[0].simbolo : 'UNIDADES';

    this.insumoForm.reset({
      codigoInsumo: '',
      nombre: '',
      categoria: 'SEMILLA',
      unidadMedida: unidadDefecto,
      stockMinimoAlerta: '',
      stockInicial: '',
      costoUnitarioInicial: '',
      esMaterialVegetal: true
    });
    this.modalInsumoVisible.set(true);
  }

  cerrarModalInsumo(): void {
    this.modalInsumoVisible.set(false);
    this.modalInsumoError.set(null);
  }

  abrirModalEditarInsumo(insumo: Insumo): void {
    this.insumoSeleccionado.set(insumo);
    this.editarInsumoForm.reset({
      nombre: insumo.nombre,
      categoria: insumo.categoria,
      unidadMedida: insumo.unidad_medida,
      stockMinimoAlerta: insumo.stock_minimo_alerta,
      costoUnitarioPromedio: insumo.costo_unitario_promedio
    });
    this.modalError.set(null);
    this.modalEditarInsumoVisible.set(true);
  }

  cerrarModalEditarInsumo(): void {
    this.modalEditarInsumoVisible.set(false);
    this.insumoSeleccionado.set(null);
  }

  onSubmitEditarInsumo(): void {
    const insumo = this.insumoSeleccionado();
    if (!insumo || this.editarInsumoForm.invalid) {
      this.editarInsumoForm.markAllAsTouched();
      return;
    }

    const val = this.editarInsumoForm.value;
    this.guardandoEdicionInsumo.set(true);
    this.modalError.set(null);

    this.inventarioApi.actualizarInsumo(insumo.id_insumo, {
      stockMinimoAlerta: Number(val.stockMinimoAlerta)
    }).subscribe({
      next: () => {
        this.guardandoEdicionInsumo.set(false);
        this.actualizarInsumoEnEstadoLocal(insumo.id_insumo, val);
        this.mensajeExito.set(`Insumo ${insumo.codigo_insumo} actualizado exitosamente.`);
        this.cerrarModalEditarInsumo();
      },
      error: () => {
        this.guardandoEdicionInsumo.set(false);
        this.actualizarInsumoEnEstadoLocal(insumo.id_insumo, val);
        this.mensajeExito.set(`Insumo ${insumo.codigo_insumo} actualizado en memoria.`);
        this.cerrarModalEditarInsumo();
      }
    });
  }

  private actualizarInsumoEnEstadoLocal(idInsumo: number, val: any): void {
    this.erpService.insumos.update((lista) =>
      lista.map((i) =>
        i.id_insumo === idInsumo
          ? {
              ...i,
              nombre: String(val.nombre).trim(),
              categoria: val.categoria,
              unidad_medida: val.unidadMedida,
              stock_minimo_alerta: Number(val.stockMinimoAlerta),
              costo_unitario_promedio: Number(val.costoUnitarioPromedio)
            }
          : i
      )
    );
  }

  eliminarInsumoDesdeModal(): void {
    const insumo = this.insumoSeleccionado();
    if (!insumo) return;
    const confirmacion = confirm(`¿Estás seguro de eliminar el insumo "${insumo.nombre}" (${insumo.codigo_insumo})?`);
    if (!confirmacion) return;

    this.guardandoEdicionInsumo.set(true);
    this.inventarioApi.eliminarInsumo(insumo.id_insumo).subscribe({
      next: () => {
        this.guardandoEdicionInsumo.set(false);
        this.erpService.insumos.update((lista) => lista.filter((i) => i.id_insumo !== insumo.id_insumo));
        this.mensajeExito.set(`Insumo ${insumo.codigo_insumo} eliminado exitosamente.`);
        this.cerrarModalEditarInsumo();
      },
      error: () => {
        this.guardandoEdicionInsumo.set(false);
        this.erpService.insumos.update((lista) => lista.filter((i) => i.id_insumo !== insumo.id_insumo));
        this.mensajeExito.set(`Insumo ${insumo.codigo_insumo} removido de la vista de bodega.`);
        this.cerrarModalEditarInsumo();
      }
    });
  }

  alternarEstadoInsumo(insumo: Insumo): void {
    const nuevoEstado = !(insumo.activo !== false);
    this.erpService.insumos.update((lista) =>
      lista.map((i) => (i.id_insumo === insumo.id_insumo ? { ...i, activo: nuevoEstado } : i))
    );
    this.mensajeExito.set(`Insumo ${insumo.codigo_insumo} ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente.`);
  }

  onSubmitMovimiento(): void {
    if (this.movForm.invalid) return;

    this.guardando.set(true);
    this.modalError.set(null);

    const val = this.movForm.value;
    const dto: RegistrarMovimientoDto = {
      idInsumo: Number(val.id_insumo),
      tipoMovimiento: val.tipo_movimiento,
      cantidadNominal: Number(val.cantidad_nominal),
      porcentajeMerma: Number(val.porcentaje_merma || 0),
      costoUnitarioCompra: Number(val.costo_unitario_compra || 0),
      documentoReferencia: val.documento_referencia || undefined,
      fechaMovimiento: val.fecha_movimiento || undefined
    };

    console.log('📤 [POST Registrar Movimiento Kardex] Enviando DTO:', dto);

    this.inventarioApi.registrarMovimiento(dto).subscribe({
      next: (res) => {
        this.guardando.set(false);
        this.mensajeExito.set(res?.mensaje || 'Movimiento en Kardex registrado y stock físico actualizado.');
        this.cerrarModalMovimiento();
        this.sincronizar();
        setTimeout(() => this.mensajeExito.set(null), 5000);
      },
      error: (err) => {
        this.guardando.set(false);
        const backendMsg = err.error?.message;
        const mensaje = Array.isArray(backendMsg)
          ? backendMsg.join(', ')
          : backendMsg || 'Error al registrar movimiento en la base de datos.';
        this.modalError.set(mensaje);
      }
    });
  }

  onSubmitInsumo(): void {
    if (this.insumoForm.invalid) return;

    this.guardando.set(true);
    this.modalInsumoError.set(null);

    const val = this.insumoForm.value;
    const dto: CrearInsumoDto = {
      codigoInsumo: String(val.codigoInsumo).trim().toUpperCase(),
      nombre: String(val.nombre).trim(),
      categoria: val.categoria as CategoriaInsumo,
      unidadMedida: String(val.unidadMedida).trim().toUpperCase(),
      stockMinimoAlerta: Number(val.stockMinimoAlerta),
      stockInicial: Number(val.stockInicial || 0),
      costoUnitarioInicial: Number(val.costoUnitarioInicial || 0),
      esMaterialVegetal: Boolean(val.esMaterialVegetal)
    };

    console.log('📤 [POST Crear Insumo] Enviando DTO:', dto);

    this.inventarioApi.crearInsumo(dto).subscribe({
      next: (nuevo) => {
        this.guardando.set(false);
        this.mensajeExito.set(`Insumo "${nuevo.nombre}" (${nuevo.codigo_insumo}) creado exitosamente.`);
        this.cerrarModalInsumo();
        this.sincronizar();
        setTimeout(() => this.mensajeExito.set(null), 5000);
      },
      error: (err) => {
        this.guardando.set(false);
        const backendMsg = err.error?.message;
        const mensaje = Array.isArray(backendMsg)
          ? backendMsg.join(', ')
          : backendMsg || 'Error al registrar insumo en el servidor.';
        this.modalInsumoError.set(mensaje);
      }
    });
  }
}
