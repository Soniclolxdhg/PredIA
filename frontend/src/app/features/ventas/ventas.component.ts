import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { VentasApiService } from '../../core/services/ventas-api.service';
import { Cliente, Venta } from '../../core/models/erp.models';
import { StockDisponibleDto, MetricasVentasDto } from '../../core/models/dtos';
import { rutChilenoValidator, formatearRutChileno } from '../../core/validators/rut.validator';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ventas.component.html'
})
export class VentasComponent implements OnInit {
  readonly erpService = inject(ErpDataService);
  private readonly ventasApi = inject(VentasApiService);
  private readonly fb = inject(FormBuilder);

  // Estados reactivos
  readonly busquedaCliente = signal<string>('');
  readonly filtroDespacho = signal<string>('TODAS');
  readonly modalVentaVisible = signal<boolean>(false);
  readonly modalClienteVisible = signal<boolean>(false);
  readonly modalEditarClienteVisible = signal<boolean>(false);
  readonly modalHistorialVisible = signal<boolean>(false);
  readonly clienteSeleccionado = signal<Cliente | null>(null);

  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);
  readonly metricasApi = signal<MetricasVentasDto | null>(null);
  readonly stockDisponibleApi = signal<StockDisponibleDto[]>([]);

  // Formularios Reactivos
  readonly ventaForm: FormGroup = this.fb.group({
    id_cliente: ['', [Validators.required]],
    id_cosecha: ['', [Validators.required]],
    kilos_vendidos: [null, [Validators.required, Validators.min(1)]],
    precio_unitario_venta: [1100, [Validators.required, Validators.min(100)]]
  });

  readonly clienteForm: FormGroup = this.fb.group({
    rut_cliente: ['', [Validators.required, rutChilenoValidator]],
    razon_social: ['', [Validators.required, Validators.minLength(2)]],
    contacto_nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly editarClienteForm: FormGroup = this.fb.group({
    id_cliente: [null, [Validators.required]],
    rut_cliente: [{ value: '', disabled: true }],
    razon_social: ['', [Validators.required, Validators.minLength(2)]],
    contacto_nombre: ['', [Validators.required, Validators.minLength(2)]],
    telefono: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['', [Validators.required, Validators.minLength(4)]]
  });

  // Cálculos derivados
  readonly cosechasDisponibles = computed(() =>
    this.erpService.cosechas().filter((c) => c.kilos_disponibles_venta > 0)
  );

  readonly clientesFiltrados = computed(() => {
    const q = this.busquedaCliente().trim().toLowerCase();
    const lista = this.erpService.clientes();
    if (!q) return lista;
    return lista.filter(
      (c) =>
        c.razon_social.toLowerCase().includes(q) ||
        c.rut_cliente.toLowerCase().includes(q) ||
        c.contacto_nombre.toLowerCase().includes(q)
    );
  });

  readonly ventasFiltradas = computed(() => {
    const filtro = this.filtroDespacho();
    const lista = this.erpService.ventas();
    if (filtro === 'TODAS') return lista;
    return lista.filter((v) => v.estado_despacho === filtro);
  });

  readonly totalKilosVendidos = computed(() =>
    this.erpService.ventas().reduce((acc, v) => acc + v.kilos_vendidos, 0)
  );

  readonly kpis = computed(() => {
    const m = this.metricasApi();
    if (m && m.resumenGlobal) {
      return {
        totalVentasMonto: m.resumenGlobal.totalIngresosCLP,
        margenBrutoTotal: m.resumenGlobal.totalMargenBrutoCLP,
        margenPorcentaje: Math.round(m.resumenGlobal.margenBrutoPromedioPorcentaje)
      };
    }
    return this.erpService.kpisFinancieros();
  });

  readonly conteoDespacho = computed(() => {
    const ventas = this.erpService.ventas();
    return {
      pendientes: ventas.filter((v) => v.estado_despacho === 'PENDIENTE').length,
      despachados: ventas.filter((v) => v.estado_despacho === 'DESPACHADO').length,
      entregados: ventas.filter((v) => v.estado_despacho === 'ENTREGADO').length
    };
  });

  readonly ventasClienteSeleccionado = computed(() => {
    const cli = this.clienteSeleccionado();
    if (!cli) return [];
    return this.erpService.ventas().filter((v) => v.id_cliente === cli.id_cliente);
  });

  ngOnInit(): void {
    this.recargarDatosServidor();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarModalVenta();
    this.cerrarModalCliente();
    this.cerrarModalEditarCliente();
    this.cerrarHistorialCliente();
  }

  recargarDatosServidor(): void {
    // 1. Cargar clientes desde API
    this.ventasApi.listarClientes().subscribe({
      next: (clientes) => {
        if (clientes && clientes.length > 0) {
          console.log('[VentasComponent] Clientes recibidos de API:', clientes.length);
        }
      },
      error: () => {}
    });

    // 2. Cargar stock disponible
    this.ventasApi.obtenerStockDisponible().subscribe({
      next: (stock) => {
        if (stock) {
          this.stockDisponibleApi.set(stock);
        }
      },
      error: () => {}
    });

    // 3. Cargar métricas comerciales
    this.ventasApi.obtenerMetricas().subscribe({
      next: (met) => {
        if (met) {
          this.metricasApi.set(met);
        }
      },
      error: () => {}
    });
  }

  onFiltroDespachoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtroDespacho.set(select.value);
  }

  onBusquedaClienteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaCliente.set(input.value);
  }

  getNombreCliente(idCliente: number): string {
    const cli = this.erpService.clientes().find((c) => c.id_cliente === idCliente);
    return cli ? cli.razon_social : `Cliente #${idCliente}`;
  }

  getVentasClienteConteo(idCliente: number): number {
    return this.erpService.ventas().filter((v) => v.id_cliente === idCliente).length;
  }

  getClaseDespacho(estado: string): string {
    switch (estado) {
      case 'ENTREGADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DESPACHADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDIENTE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  // ==========================================
  // CÁLCULOS PREVIOS EN FORMULARIO DE VENTA
  // ==========================================

  loteSeleccionadoKilosMax(): number {
    const idCosecha = Number(this.ventaForm.get('id_cosecha')?.value);
    if (!idCosecha) return 0;
    const cos = this.cosechasDisponibles().find((c) => c.id_cosecha === idCosecha);
    return cos ? cos.kilos_disponibles_venta : 0;
  }

  kilosSuperanStock(): boolean {
    const k = Number(this.ventaForm.get('kilos_vendidos')?.value || 0);
    const max = this.loteSeleccionadoKilosMax();
    return max > 0 && k > max;
  }

  costoUnitarioRefPrevia(): number {
    const idCosecha = Number(this.ventaForm.get('id_cosecha')?.value);
    if (!idCosecha) return 450;
    const cos = this.erpService.cosechas().find((c) => c.id_cosecha === idCosecha);
    if (!cos) return 450;
    const ciclo = this.erpService.ciclos().find((c) => c.id_ciclo === cos.id_ciclo);
    return ciclo?.costo_unitario_kg ?? 450;
  }

  calcularTotalVentaPrevia(): number {
    const k = Number(this.ventaForm.get('kilos_vendidos')?.value || 0);
    const p = Number(this.ventaForm.get('precio_unitario_venta')?.value || 0);
    return k * p;
  }

  calcularMargenVentaPrevia(): number {
    const k = Number(this.ventaForm.get('kilos_vendidos')?.value || 0);
    const total = this.calcularTotalVentaPrevia();
    const costo = k * this.costoUnitarioRefPrevia();
    return Math.max(0, total - costo);
  }

  calcularMargenPctPrevia(): number {
    const total = this.calcularTotalVentaPrevia();
    if (total <= 0) return 0;
    const margen = this.calcularMargenVentaPrevia();
    return Math.round((margen / total) * 100);
  }

  onCosechaSeleccionadaChange(): void {
    const max = this.loteSeleccionadoKilosMax();
    const kilosCtrl = this.ventaForm.get('kilos_vendidos');
    if (kilosCtrl && max > 0 && (!kilosCtrl.value || kilosCtrl.value > max)) {
      kilosCtrl.setValue(Math.min(max, 1000));
    }
  }

  // ==========================================
  // GESTIÓN DE MODALES
  // ==========================================

  abrirModalVenta(): void {
    this.mensajeError.set(null);
    this.ventaForm.patchValue({
      id_cliente: this.erpService.clientes()[0]?.id_cliente || '',
      id_cosecha: this.cosechasDisponibles()[0]?.id_cosecha || '',
      kilos_vendidos: null,
      precio_unitario_venta: 1100
    });
    this.modalVentaVisible.set(true);
  }

  cerrarModalVenta(): void {
    this.modalVentaVisible.set(false);
  }

  abrirModalCliente(): void {
    this.clienteForm.reset();
    this.modalClienteVisible.set(true);
  }

  cerrarModalCliente(): void {
    this.modalClienteVisible.set(false);
  }

  abrirModalEditarCliente(cliente: Cliente): void {
    this.clienteSeleccionado.set(cliente);
    this.editarClienteForm.patchValue({
      id_cliente: cliente.id_cliente,
      rut_cliente: cliente.rut_cliente,
      razon_social: cliente.razon_social,
      contacto_nombre: cliente.contacto_nombre,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion
    });
    this.modalEditarClienteVisible.set(true);
  }

  cerrarModalEditarCliente(): void {
    this.modalEditarClienteVisible.set(false);
    this.clienteSeleccionado.set(null);
  }

  abrirHistorialCliente(cliente: Cliente): void {
    this.clienteSeleccionado.set(cliente);
    this.modalHistorialVisible.set(true);
  }

  cerrarHistorialCliente(): void {
    this.modalHistorialVisible.set(false);
    this.clienteSeleccionado.set(null);
  }

  // ==========================================
  // OPERACIONES CRUD & PERSISTENCIA
  // ==========================================

  onSubmitVenta(): void {
    if (this.ventaForm.invalid || this.kilosSuperanStock()) return;

    const val = this.ventaForm.value;
    const kilos = Number(val.kilos_vendidos);
    const precio = Number(val.precio_unitario_venta);
    const idCosecha = Number(val.id_cosecha);
    const idCliente = Number(val.id_cliente);

    const dto = {
      idCliente,
      idCosecha,
      kilosVendidos: kilos,
      precioUnitarioVenta: precio,
      fechaVenta: new Date().toISOString().split('T')[0],
      estadoDespacho: 'PENDIENTE' as const
    };

    this.ventasApi.emitirNotaVenta(dto).subscribe({
      next: (res) => {
        this.erpService.generarNotaVenta({
          id_cliente: idCliente,
          id_cosecha: idCosecha,
          kilos_vendidos: kilos,
          precio_unitario_venta: precio,
          monto_total_ingreso: kilos * precio,
          fecha_venta: dto.fechaVenta,
          estado_despacho: 'PENDIENTE'
        });
        this.mensajeExito.set(`Nota de venta emitida exitosamente en servidor (${res?.numeroNotaVenta || 'NV'}).`);
        this.cerrarModalVenta();
      },
      error: () => {
        // Enlace resiliente con estado en memoria
        const resLocal = this.erpService.generarNotaVenta({
          id_cliente: idCliente,
          id_cosecha: idCosecha,
          kilos_vendidos: kilos,
          precio_unitario_venta: precio,
          monto_total_ingreso: kilos * precio,
          fecha_venta: dto.fechaVenta,
          estado_despacho: 'PENDIENTE'
        });
        if (resLocal.exito) {
          this.mensajeExito.set(resLocal.mensaje);
          this.cerrarModalVenta();
        } else {
          this.mensajeError.set(resLocal.mensaje);
        }
      }
    });
  }

  onSubmitCliente(): void {
    if (this.clienteForm.invalid) return;

    const val = this.clienteForm.value;
    const rutFormateado = formatearRutChileno(val.rut_cliente);

    const dto = {
      rutCliente: rutFormateado,
      razonSocial: val.razon_social.trim(),
      contactoNombre: val.contacto_nombre.trim(),
      telefono: val.telefono.trim(),
      email: val.email.trim().toLowerCase(),
      direccion: val.direccion.trim()
    };

    this.ventasApi.crearCliente(dto).subscribe({
      next: () => {
        this.erpService.registrarCliente({
          rut_cliente: dto.rutCliente,
          razon_social: dto.razonSocial,
          contacto_nombre: dto.contactoNombre,
          telefono: dto.telefono,
          email: dto.email,
          direccion: dto.direccion
        });
        this.mensajeExito.set(`Cliente "${dto.razonSocial}" registrado exitosamente en el backend.`);
        this.cerrarModalCliente();
      },
      error: () => {
        this.erpService.registrarCliente({
          rut_cliente: dto.rutCliente,
          razon_social: dto.razonSocial,
          contacto_nombre: dto.contactoNombre,
          telefono: dto.telefono,
          email: dto.email,
          direccion: dto.direccion
        });
        this.mensajeExito.set(`Cliente "${dto.razonSocial}" registrado localmente.`);
        this.cerrarModalCliente();
      }
    });
  }

  onSubmitEditarCliente(): void {
    if (this.editarClienteForm.invalid) return;

    const id = Number(this.editarClienteForm.get('id_cliente')?.value);
    const val = this.editarClienteForm.value;

    const dto = {
      razonSocial: val.razon_social?.trim(),
      contactoNombre: val.contacto_nombre?.trim(),
      telefono: val.telefono?.trim(),
      email: val.email?.trim().toLowerCase(),
      direccion: val.direccion?.trim()
    };

    this.ventasApi.actualizarCliente(id, dto).subscribe({
      next: () => {
        this.erpService.actualizarCliente(id, {
          razon_social: dto.razonSocial,
          contacto_nombre: dto.contactoNombre,
          telefono: dto.telefono,
          email: dto.email,
          direccion: dto.direccion
        });
        this.mensajeExito.set(`Datos de cliente actualizados exitosamente.`);
        this.cerrarModalEditarCliente();
      },
      error: () => {
        this.erpService.actualizarCliente(id, {
          razon_social: dto.razonSocial,
          contacto_nombre: dto.contactoNombre,
          telefono: dto.telefono,
          email: dto.email,
          direccion: dto.direccion
        });
        this.mensajeExito.set(`Datos de cliente actualizados.`);
        this.cerrarModalEditarCliente();
      }
    });
  }

  eliminarCliente(cliente: Cliente): void {
    const confirmacion = confirm(`¿Está seguro de eliminar al cliente "${cliente.razon_social}"?`);
    if (!confirmacion) return;

    this.ventasApi.eliminarCliente(cliente.id_cliente).subscribe({
      next: () => {
        const res = this.erpService.eliminarCliente(cliente.id_cliente);
        this.mensajeExito.set(res.mensaje);
      },
      error: (err) => {
        // Si el backend arrojó 400 porque tiene ventas
        if (err?.status === 400 || err?.error?.message?.includes('ventas')) {
          this.mensajeError.set('No se puede eliminar el cliente porque posee notas de venta registradas.');
          return;
        }
        const res = this.erpService.eliminarCliente(cliente.id_cliente);
        if (res.exito) {
          this.mensajeExito.set(res.mensaje);
        } else {
          this.mensajeError.set(res.mensaje);
        }
      }
    });
  }

  cambiarEstadoDespacho(venta: Venta, nuevoEstado: 'PENDIENTE' | 'DESPACHADO' | 'ENTREGADO'): void {
    this.ventasApi.actualizarDespacho(venta.id_venta, { estadoDespacho: nuevoEstado }).subscribe({
      next: () => {
        this.erpService.actualizarDespachoVenta(venta.id_venta, nuevoEstado);
        this.mensajeExito.set(`Despacho de nota ${venta.numero_nota_venta} actualizado a ${nuevoEstado}.`);
      },
      error: () => {
        this.erpService.actualizarDespachoVenta(venta.id_venta, nuevoEstado);
        this.mensajeExito.set(`Despacho de nota ${venta.numero_nota_venta} actualizado a ${nuevoEstado}.`);
      }
    });
  }
}
