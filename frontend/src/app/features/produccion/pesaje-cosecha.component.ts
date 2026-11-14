import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { CrearCosechaDto } from '../../core/models/dtos';

/**
 * Componente: Pesaje de Cosecha al Pie de Nave
 * Captura los kilos netos pesados en báscula al momento de cosechar en el invernadero,
 * clasifica la producción según estándar comercial (Primera, Segunda, Descarte y calidades dinámicas)
 * y muestra el total cosechado desglosado por ciclo de cultivo y tipo de verdura plantada.
 */
@Component({
  selector: 'app-pesaje-cosecha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './pesaje-cosecha.component.html'
})
export class PesajeCosechaComponent {
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly mensajeExito = signal<string | null>(null);

  // Lista dinámica de calidades (DESCARTE se mantiene siempre fija)
  readonly calidades = signal<string[]>(['PRIMERA', 'SEGUNDA', 'DESCARTE']);
  readonly nuevaCalidadTexto = signal<string>('');

  // Formulario reactivo para la captura del pesaje
  readonly cosechaForm: FormGroup = this.fb.group({
    id_ciclo: ['', [Validators.required]],
    fecha_cosecha: [new Date().toISOString().split('T')[0], [Validators.required]],
    kilos_netos: [null, [Validators.required, Validators.min(0.1)]],
    calidad_grado: ['PRIMERA', [Validators.required]]
  });

  /**
   * Suma la totalidad de kilos cosechados en la temporada actual
   */
  get totalKgTemporada(): number {
    return this.erpService.cosechas().reduce((acc, c) => acc + c.kilos_netos, 0);
  }

  /**
   * Desglose del total cosechado por ciclo de cultivo y verdura plantada
   */
  readonly desgloseCosechas = computed(() => {
    const cosechas = this.erpService.cosechas();
    const ciclos = this.erpService.ciclos();
    const mapa = new Map<number, { cicloId: number; variedad: string; nave: string; totalKg: number }>();

    for (const c of cosechas) {
      const ciclo = ciclos.find((ci) => ci.id_ciclo === c.id_ciclo);
      const variedad = ciclo?.variedad || 'Cultivo Agrícola';
      const nave = ciclo ? `Nave #${ciclo.id_nave}` : 'Invernadero';
      if (!mapa.has(c.id_ciclo)) {
        mapa.set(c.id_ciclo, { cicloId: c.id_ciclo, variedad, nave, totalKg: 0 });
      }
      mapa.get(c.id_ciclo)!.totalKg += c.kilos_netos;
    }

    return Array.from(mapa.values());
  });

  /**
   * Agrega una categoría de calidad personalizada manteniendo DESCARTE siempre presente
   */
  agregarCalidad(): void {
    const nueva = this.nuevaCalidadTexto().trim().toUpperCase();
    if (!nueva) return;

    if (!this.calidades().includes(nueva)) {
      const sinDescarte = this.calidades().filter((c) => c !== 'DESCARTE');
      sinDescarte.push(nueva);
      sinDescarte.push('DESCARTE'); // DESCARTE permanece siempre
      this.calidades.set(sinDescarte);
      this.cosechaForm.patchValue({ calidad_grado: nueva });
    }
    this.nuevaCalidadTexto.set('');
  }

  getBotonCalidadActivo(cal: string): string {
    switch (cal) {
      case 'PRIMERA': return 'bg-emerald-700 text-white border-emerald-800 font-bold';
      case 'SEGUNDA': return 'bg-amber-600 text-white border-amber-700 font-bold';
      case 'DESCARTE': return 'bg-rose-700 text-white border-rose-800 font-bold';
      default: return 'bg-purple-700 text-white border-purple-800 font-bold';
    }
  }

  getBadgeCalidad(cal: string): string {
    switch (cal) {
      case 'PRIMERA': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SEGUNDA': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DESCARTE': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-purple-50 text-purple-800 border-purple-200';
    }
  }

  onSubmitCosecha(): void {
    if (this.cosechaForm.invalid) return;

    const val = this.cosechaForm.value;
    const currentUser = this.authService.currentUser();
    const idCiclo = Number(val.id_ciclo);

    // DTO Oficial para backend NestJS (HU03)
    const dto: CrearCosechaDto = {
      idCiclo: idCiclo,
      fechaCosecha: val.fecha_cosecha,
      kilosNetos: Number(val.kilos_netos),
      calidadGrado: val.calidad_grado
    };

    console.log('📤 [POST Registrar Cosecha] Enviando CrearCosechaDto:', dto);

    // Enviar a la API de backend NestJS
    this.erpService.registrarCosechaApi(dto).subscribe({
      next: (resApi) => {
        console.log('📥 [POST Registrar Cosecha] Respuesta recibida:', resApi);
      },
      error: (errApi) => {
        console.warn('⚠️ [POST Registrar Cosecha] Notificación API:', errApi);
      }
    });

    // Actualizar estado reactivo local del ERP
    this.erpService.registrarCosecha({
      id_ciclo: idCiclo,
      fecha_cosecha: val.fecha_cosecha,
      kilos_netos: Number(val.kilos_netos),
      calidad_grado: val.calidad_grado,
      id_usuario_pesaje: currentUser?.id_usuario || 2
    });

    this.mensajeExito.set(`Pesaje de ${val.kilos_netos} Kg registrado exitosamente.`);
    this.cosechaForm.patchValue({ kilos_netos: null });
  }
}
