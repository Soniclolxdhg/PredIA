import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { InventarioApiService } from '../../core/services/inventario.service';
import { TipoMovimiento, CategoriaInsumo } from '../../core/models/enum.types';
import { Insumo, MovimientoBodega } from '../../core/models/erp.models';
import { CrearInsumoDto, RegistrarMovimientoDto } from '../../core/models/dtos';

/**
 * Controlador de Kardex de Inventario y Control de Mermas (HU04).
 * Conecta directamente con la API REST oficial de NestJS y Supabase,
 * gestiona insumos, folios autoincrementables, cálculo de PMP, cantidades decimales,
 * filtros multicriterio en historial y ajuste de merma biológica.
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
  readonly inventarioApi = inject(InventarioApiService);
  private readonly fb = inject(FormBuilder);

  // Estados reactivos de la vista
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly modalMovimientoVisible = signal<boolean>(false);
  readonly modalInsumoVisible = signal<boolean>(false);
  readonly soloCriticos = signal<boolean>(false);

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
    cantidad_nominal: [100.0, [Validators.required, Validators.min(0.01)]],
    porcentaje_merma: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    costo_unitario_compra: [50, [Validators.required, Validators.min(0)]],
    documento_referencia: ['']
  });

  // Formulario: Crear Insumo
  readonly insumoForm: FormGroup = this.fb.group({
    codigoInsumo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    categoria: ['SEMILLA', [Validators.required]],
    unidadMedida: ['UNIDADES', [Validators.required, Validators.maxLength(20)]],
    stockMinimoAlerta: [1000, [Validators.required, Validators.min(0)]],
    stockInicial: [0, [Validators.min(0)]],
    costoUnitarioInicial: [0, [Validators.min(0)]],
    esMaterialVegetal: [true]
  });

  // Señales computadas de insumos
  readonly totalCriticos = computed(() =>
    this.erpService.insumos().filter((i) => i.es_stock_critico || i.stock_actual <= i.stock_minimo_alerta).length
  );

  readonly insumosFiltrados = computed(() => {
    const lista = this.erpService.insumos();
    if (this.soloCriticos()) {
      return lista.filter((i) => i.es_stock_critico || i.stock_actual <= i.stock_minimo_alerta);
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
      const coincideInsumo = insumoId === 'TODOS' || String(m.id_insumo) === insumoId;
      const coincideTipo = tipo === 'TODOS' || m.tipo_movimiento === tipo;

      let coincideFecha = true;
      if (desde && m.fecha_movimiento) {
        coincideFecha = coincideFecha && new Date(m.fecha_movimiento) >= new Date(desde);
      }
      if (hasta && m.fecha_movimiento) {
        coincideFecha = coincideFecha && new Date(m.fecha_movimiento) <= new Date(hasta + 'T23:59:59');
      }

      let coincideTexto = true;
      if (q) {
        const doc = (m.documento_referencia || '').toLowerCase();
        const insName = this.getNombreInsumo(m.id_insumo).toLowerCase();
        coincideTexto = doc.includes(q) || insName.includes(q);
      }

      return coincideInsumo && coincideTipo && coincideFecha && coincideTexto;
    });
  });

  ngOnInit(): void {
    this.sincronizar();
  }

  /**
   * Sincroniza insumos y movimientos desde la API de backend
   */
  sincronizar(): void {
    this.cargando.set(true);
    this.mensajeError.set(null);

    this.erpService.cargarInsumos().subscribe({
      next: () => {
        this.erpService.cargarMovimientos().subscribe({
          next: () => this.cargando.set(false),
          error: (err) => {
            console.error('Error al cargar movimientos:', err);
            this.cargando.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar insumos:', err);
        this.mensajeError.set('No se pudo conectar con el catálogo de insumos de la API.');
        this.cargando.set(false);
      }
    });
  }

  alternarFiltroCriticos(valor: boolean): void {
    this.soloCriticos.set(valor);
  }

  getNombreInsumo(idInsumo: number): string {
    const ins = this.erpService.insumos().find((i) => i.id_insumo === idInsumo);
    return ins ? ins.nombre : `Insumo #${idInsumo}`;
  }

  getClaseBadge(tipo: TipoMovimiento): string {
    switch (tipo) {
      case 'ENTRADA_COMPRA':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SALIDA_LABOR':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'AJUSTE_MERMA':
        return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  }

  calcularCantidadNetaPrevia(): number {
    const nom = Number(this.movForm.get('cantidad_nominal')?.value || 0);
    const merma = Number(this.movForm.get('porcentaje_merma')?.value || 0);
    return Math.round(nom * (1 - merma / 100) * 100) / 100;
  }

  /**
   * Genera de forma automática y secuencial el folio para Kardex o Mermas
   */
  generarFolioSugerido(tipo: TipoMovimiento = 'ENTRADA_COMPRA'): string {
    const movs = this.erpService.movimientosBodega();
    const year = new Date().getFullYear();
    if (tipo === 'AJUSTE_MERMA') {
      const totalMermas = movs.filter((m) => m.tipo_movimiento === 'AJUSTE_MERMA').length + 1;
      return `#MER-${year}-${String(totalMermas).padStart(4, '0')}`;
    }
    const totalReg = movs.filter((m) => m.tipo_movimiento !== 'AJUSTE_MERMA').length + 1;
    return `#MOV-${year}-${String(totalReg).padStart(4, '0')}`;
  }

  onTipoMovimientoChange(nuevoTipo: TipoMovimiento): void {
    const actualDoc = this.movForm.get('documento_referencia')?.value || '';
    if (!actualDoc || actualDoc.startsWith('#MOV-') || actualDoc.startsWith('#MER-')) {
      this.movForm.patchValue({ documento_referencia: this.generarFolioSugerido(nuevoTipo) });
    }
  }

  abrirModalMovimiento(): void {
    this.modalError.set(null);
    const tipo = (this.movForm.get('tipo_movimiento')?.value as TipoMovimiento) || 'ENTRADA_COMPRA';
    const folio = this.generarFolioSugerido(tipo);
    this.movForm.patchValue({
      documento_referencia: folio,
      cantidad_nominal: 100.0,
      porcentaje_merma: 0,
      costo_unitario_compra: 50
    });
    this.modalMovimientoVisible.set(true);
  }

  cerrarModalMovimiento(): void {
    this.modalMovimientoVisible.set(false);
    this.modalError.set(null);
  }

  abrirModalInsumo(): void {
    this.modalInsumoError.set(null);
    this.modalInsumoVisible.set(true);
  }

  cerrarModalInsumo(): void {
    this.modalInsumoVisible.set(false);
    this.modalInsumoError.set(null);
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
        this.insumoForm.reset({
          codigoInsumo: '',
          nombre: '',
          categoria: 'SEMILLA',
          unidadMedida: 'UNIDADES',
          stockMinimoAlerta: 1000,
          stockInicial: 0,
          costoUnitarioInicial: 0,
          esMaterialVegetal: true
        });
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
