import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Encabezado con Botones -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🛒</span>
            <h2 class="text-xl font-bold text-slate-800">Comercial: Clientes & Notas de Venta (HU08/10)</h2>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Generación de comprobantes de venta con trazabilidad de lote cosechado y cálculo de margen operativo.
          </p>
        </div>

        <div class="flex flex-wrap gap-2.5">
          <button
            type="button"
            (click)="abrirModalCliente()"
            class="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl border border-slate-300 transition-colors touch-target">
            👤 Nuevo Cliente
          </button>
          <button
            type="button"
            (click)="abrirModalVenta()"
            class="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors touch-target">
            📄 Emitir Nota de Venta
          </button>
        </div>
      </div>

      <!-- Alertas de Negocio -->
      <div *ngIf="mensajeError()" class="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">⚠️ {{ mensajeError() }}</span>
        <button (click)="mensajeError.set(null)" class="text-rose-500 font-bold hover:text-rose-800">✕</button>
      </div>

      <div *ngIf="mensajeExito()" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center justify-between">
        <span class="font-medium">✓ {{ mensajeExito() }}</span>
        <button (click)="mensajeExito.set(null)" class="text-emerald-600 font-bold hover:text-emerald-900">✕</button>
      </div>

      <!-- KPIs Comerciales -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold uppercase text-slate-500">VENTAS TOTALES ($)</div>
          <div class="text-2xl font-black font-mono text-slate-900 mt-1">
            \${{ erpService.kpisFinancieros().totalVentasMonto | number }}
          </div>
          <div class="text-xs text-slate-500 mt-1">Facturación acumulada temporada</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold uppercase text-slate-500">MARGEN BRUTO OPERATIVO</div>
          <div class="text-2xl font-black font-mono text-emerald-700 mt-1">
            \${{ erpService.kpisFinancieros().margenBrutoTotal | number }}
          </div>
          <div class="text-xs text-emerald-700 font-semibold mt-1">
            Retorno: {{ erpService.kpisFinancieros().margenPorcentaje }}% sobre ventas
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div class="text-xs font-bold uppercase text-slate-500">VOLUMEN DESPACHADO</div>
          <div class="text-2xl font-black font-mono text-blue-700 mt-1">
            {{ totalKilosVendidos | number }} Kg
          </div>
          <div class="text-xs text-slate-500 mt-1">Despachado a clientes mayoristas</div>
        </div>
      </div>

      <!-- Tabla de Notas de Venta -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 class="font-bold text-slate-800 text-sm">Notas de Venta Emitidas</h3>
          <span class="text-xs text-slate-500">{{ erpService.ventas().length }} notas registradas</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">Nº Nota</th>
                <th class="p-3">Cliente / Razón Social</th>
                <th class="p-3">Lote Cosecha</th>
                <th class="p-3">Kilos Vendidos</th>
                <th class="p-3">Precio Venta</th>
                <th class="p-3">Total Ingreso</th>
                <th class="p-3">Costo Ref.</th>
                <th class="p-3">Margen Bruto</th>
                <th class="p-3">Despacho</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let v of erpService.ventas()" class="hover:bg-slate-50">
                <td class="p-3 font-mono font-bold text-slate-900">{{ v.numero_nota_venta }}</td>
                <td class="p-3">
                  <div class="font-semibold text-slate-900">{{ getNombreCliente(v.id_cliente) }}</div>
                  <div class="text-[11px] text-slate-500">{{ v.fecha_venta }}</div>
                </td>
                <td class="p-3 font-mono text-xs text-slate-600">#COS-{{ v.id_cosecha }}</td>
                <td class="p-3 font-bold font-mono text-slate-800">{{ v.kilos_vendidos | number }} Kg</td>
                <td class="p-3 font-mono text-slate-700">\${{ v.precio_unitario_venta | number }}</td>
                <td class="p-3 font-mono font-bold text-slate-900">\${{ v.monto_total_ingreso | number }}</td>
                <td class="p-3 font-mono text-slate-500 text-xs">\${{ v.costo_unitario_ciclo_ref | number:'1.2-2' }}</td>
                <td class="p-3 font-mono font-bold text-emerald-700">+\${{ v.margen_bruto_operativo | number }}</td>
                <td class="p-3">
                  <span [class]="getClaseDespacho(v.estado_despacho)" class="px-2 py-0.5 rounded-full text-[11px] font-bold border">
                    {{ v.estado_despacho }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Directorio de Clientes -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 font-bold text-slate-800 text-sm">
          Directorio de Clientes Registrados (HU08)
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div *ngFor="let cli of erpService.clientes()" class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div class="font-bold text-sm text-slate-900">{{ cli.razon_social }}</div>
            <div class="text-slate-500 font-mono">RUT: {{ cli.rut_cliente }}</div>
            <div class="text-slate-700">Contacto: <strong>{{ cli.contacto_nombre }}</strong></div>
            <div class="text-slate-600">{{ cli.telefono }} &bull; {{ cli.email }}</div>
            <div class="text-slate-500 truncate">{{ cli.direccion }}</div>
          </div>
        </div>
      </div>

      <!-- Modal Emisión Nota de Venta -->
      <div *ngIf="modalVentaVisible()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📄</span>
              <span>Emitir Nota de Venta Agrícola</span>
            </h3>
            <button (click)="cerrarModalVenta()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="ventaForm" (ngSubmit)="onSubmitVenta()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Cliente Comprador *</label>
              <select formControlName="id_cliente" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione cliente...</option>
                <option *ngFor="let cli of erpService.clientes()" [value]="cli.id_cliente">
                  {{ cli.razon_social }} (RUT: {{ cli.rut_cliente }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Lote de Cosecha Origen *</label>
              <select formControlName="id_cosecha" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none">
                <option value="" disabled>Seleccione lote cosechado...</option>
                <option *ngFor="let cos of erpService.cosechas()" [value]="cos.id_cosecha">
                  #COS-{{ cos.id_cosecha }} &bull; Ciclo #{{ cos.id_ciclo }} &bull; Disp: {{ cos.kilos_disponibles_venta }} Kg ({{ cos.calidad_grado }})
                </option>
              </select>
              <span class="text-[11px] text-slate-500 mt-1 block">Verifica disponibilidad de kilos antes de autorizar.</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Kilos a Vender *</label>
                <input
                  type="number"
                  min="1"
                  formControlName="kilos_vendidos"
                  placeholder="ej. 1000"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Precio Venta $/Kg *</label>
                <input
                  type="number"
                  min="100"
                  formControlName="precio_unitario_venta"
                  placeholder="ej. 980"
                  class="w-full p-2.5 text-sm rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex justify-between items-center">
              <span class="text-emerald-900 font-semibold">Total a Facturar Estimado:</span>
              <span class="font-mono font-black text-emerald-800 text-sm">
                \${{ calcularTotalVentaPrevia() | number }}
              </span>
            </div>

            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button
                type="button"
                (click)="cerrarModalVenta()"
                class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="ventaForm.invalid"
                class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">
                Autorizar y Emitir
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Registro Cliente -->
      <div *ngIf="modalClienteVisible()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 class="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>👤</span>
              <span>Registrar Nuevo Cliente Comprador</span>
            </h3>
            <button (click)="cerrarModalCliente()" class="text-slate-400 hover:text-slate-700 font-bold text-lg">✕</button>
          </div>

          <form [formGroup]="clienteForm" (ngSubmit)="onSubmitCliente()" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Razón Social *</label>
              <input type="text" formControlName="razon_social" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">RUT Empresa *</label>
                <input type="text" formControlName="rut_cliente" placeholder="76.123.456-7" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Nombre Contacto *</label>
                <input type="text" formControlName="contacto_nombre" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Teléfono *</label>
                <input type="text" formControlName="telefono" placeholder="+56 9 1234 5678" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                <input type="email" formControlName="email" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Dirección de Despacho *</label>
              <input type="text" formControlName="direccion" class="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none" />
            </div>

            <div class="pt-3 flex gap-3 justify-end border-t border-slate-100">
              <button type="button" (click)="cerrarModalCliente()" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancelar</button>
              <button type="submit" [disabled]="clienteForm.invalid" class="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs transition-colors">Guardar Cliente</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class VentasComponent {
  readonly erpService = inject(ErpDataService);
  private readonly fb = inject(FormBuilder);

  readonly modalVentaVisible = signal(false);
  readonly modalClienteVisible = signal(false);
  readonly mensajeError = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  readonly ventaForm: FormGroup = this.fb.group({
    id_cliente: ['', [Validators.required]],
    id_cosecha: ['', [Validators.required]],
    kilos_vendidos: [1000, [Validators.required, Validators.min(1)]],
    precio_unitario_venta: [980, [Validators.required, Validators.min(100)]]
  });

  readonly clienteForm: FormGroup = this.fb.group({
    razon_social: ['', [Validators.required]],
    rut_cliente: ['', [Validators.required]],
    contacto_nombre: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    direccion: ['', [Validators.required]]
  });

  get totalKilosVendidos(): number {
    return this.erpService.ventas().reduce((acc, v) => acc + v.kilos_vendidos, 0);
  }

  getNombreCliente(idCliente: number): string {
    const cli = this.erpService.clientes().find((c) => c.id_cliente === idCliente);
    return cli ? cli.razon_social : `Cliente #${idCliente}`;
  }

  getClaseDespacho(estado: string): string {
    switch (estado) {
      case 'ENTREGADO': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DESPACHADO': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDIENTE': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  }

  calcularTotalVentaPrevia(): number {
    const k = Number(this.ventaForm.get('kilos_vendidos')?.value || 0);
    const p = Number(this.ventaForm.get('precio_unitario_venta')?.value || 0);
    return k * p;
  }

  abrirModalVenta(): void {
    this.mensajeError.set(null);
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

  onSubmitVenta(): void {
    if (this.ventaForm.invalid) return;

    const res = this.erpService.generarNotaVenta(this.ventaForm.value);
    if (!res.exito) {
      this.mensajeError.set(res.mensaje);
    } else {
      this.mensajeExito.set(res.mensaje);
      this.cerrarModalVenta();
    }
  }

  onSubmitCliente(): void {
    if (this.clienteForm.invalid) return;

    this.erpService.registrarCliente(this.clienteForm.value);
    this.mensajeExito.set('Cliente registrado exitosamente.');
    this.cerrarModalCliente();
  }
}
