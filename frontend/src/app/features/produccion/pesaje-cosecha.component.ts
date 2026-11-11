import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { CrearCosechaDto } from '../../core/models/dtos';

/**
 * Componente para el Pesaje de Cosecha al Pie de Nave (HU03).
 * Captura los kilos netos pesados en báscula al momento de cosechar en el invernadero,
 * clasifica la producción según estándar comercial (Primera, Segunda, Descarte)
 * y actualiza el costo unitario por kilo recalculando el acumulado del ciclo.
 */
@Component({
  selector: 'app-pesaje-cosecha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesaje-cosecha.component.html'
})
export class PesajeCosechaComponent {
  // Servicios de datos y sesión
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Mensaje de éxito tras registrar el pesaje
  readonly mensajeExito = signal<string | null>(null);

  // Categorías comerciales de clasificación de cosecha
  readonly calidades = ['PRIMERA', 'SEGUNDA', 'DESCARTE'];

  // Formulario reactivo para la captura del pesaje
  readonly cosechaForm: FormGroup = this.fb.group({
    id_ciclo: ['', [Validators.required]],
    fecha_cosecha: [new Date().toISOString().split('T')[0], [Validators.required]],
    kilos_netos: [1500, [Validators.required, Validators.min(1)]],
    calidad_grado: ['PRIMERA', [Validators.required]]
  });

  /**
   * Suma la totalidad de kilos cosechados en la temporada actual
   */
  get totalKgTemporada(): number {
    return this.erpService.cosechas().reduce((acc, c) => acc + c.kilos_netos, 0);
  }

  /**
   * Retorna las clases de Tailwind para el botón de calidad cuando está seleccionado
   */
  getBotonCalidadActivo(cal: string): string {
    switch (cal) {
      case 'PRIMERA': return 'bg-emerald-700 text-white border-emerald-800 font-bold';
      case 'SEGUNDA': return 'bg-amber-600 text-white border-amber-700 font-bold';
      case 'DESCARTE': return 'bg-rose-700 text-white border-rose-800 font-bold';
      default: return 'bg-slate-800 text-white';
    }
  }

  /**
   * Retorna el estilo de la insignia de calidad para la tabla de historial
   */
  getBadgeCalidad(cal: string): string {
    switch (cal) {
      case 'PRIMERA': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SEGUNDA': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DESCARTE': return 'bg-rose-50 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  /**
   * Registra el lote de cosecha en el servicio, actualiza el acumulado y resetea el control de kilos
   */
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

    console.log('📤 [POST Botón Registrar Pesaje Cosecha (HU03)] Enviando CrearCosechaDto:', dto);

    // Enviar a la API de backend NestJS
    this.erpService.registrarCosechaApi(dto).subscribe({
      next: (resApi) => {
        console.log('📥 [POST Registrar Cosecha HU03] Respuesta de API recibida:', resApi);
      },
      error: (errApi) => {
        console.warn('⚠️ [POST Registrar Cosecha HU03] Notificación de API:', errApi);
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
