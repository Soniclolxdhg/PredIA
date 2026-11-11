import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErpDataService } from '../../core/services/erp-data.service';
import { AuthService } from '../../core/services/auth.service';
import { TipoLabor } from '../../core/models/enum.types';
import { CrearLaborDto } from '../../core/models/dtos';

/**
 * Componente para el Registro de Labores Agrícolas en Terreno (HU02).
 * Permite registrar faenas en los invernaderos (riego, fertilización, fitosanitarios, siembra y cosecha),
 * asociar el responsable, imputar costos por horas dedicadas y descontar insumos de bodega de forma automática.
 */
@Component({
  selector: 'app-registro-labores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registro-labores.component.html'
})
export class RegistroLaboresComponent {
  // Servicios de datos y sesión
  readonly erpService = inject(ErpDataService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Mensaje de éxito tras registrar la faena
  readonly mensajeExito = signal<string | null>(null);

  // Listado de tipos de labores agronómicas contempladas en el sistema
  readonly tiposLabor: TipoLabor[] = [
    'SIEMBRA',
    'RIEGO',
    'FERTILIZACION',
    'FITOSANITARIO',
    'COSECHA'
  ];

  // Formulario reactivo para la captura de faenas
  readonly laborForm: FormGroup = this.fb.group({
    id_ciclo: ['', [Validators.required]],
    tipo_labor: ['RIEGO', [Validators.required]],
    fecha_ejecucion: [new Date().toISOString().split('T')[0], [Validators.required]],
    horas_dedicadas: [4, [Validators.required, Validators.min(0.5)]],
    id_insumo_utilizado: [''],
    cantidad_insumo_utilizado: [null],
    observaciones_tecnicas: ['']
  });

  /**
   * Actualiza el tipo de labor en el formulario al hacer clic sobre el botón correspondiente
   */
  seleccionarTipoLabor(tipo: TipoLabor): void {
    this.laborForm.patchValue({ tipo_labor: tipo });
  }

  /**
   * Retorna el emoji representativo para cada tipo de labor agronómica
   */
  getIconoLabor(tipo: TipoLabor): string {
    switch (tipo) {
      case 'SIEMBRA': return '🌱';
      case 'RIEGO': return '💧';
      case 'FERTILIZACION': return '🧪';
      case 'FITOSANITARIO': return '🛡️';
      case 'COSECHA': return '🧺';
    }
  }

  /**
   * Procesa el formulario, registra la labor en ErpDataService e imputa costos y consumos
   */
  onSubmitLabor(): void {
    if (this.laborForm.invalid) return;

    const val = this.laborForm.value;
    const currentUser = this.authService.currentUser();
    const idCiclo = Number(val.id_ciclo);

    // DTO Oficial para backend NestJS (HU02)
    const dto: CrearLaborDto = {
      idCiclo: idCiclo,
      tipoLabor: val.tipo_labor,
      fechaEjecucion: val.fecha_ejecucion,
      horasDedicadas: Number(val.horas_dedicadas),
      observacionesTecnicas: val.observaciones_tecnicas ? val.observaciones_tecnicas.trim() : undefined
    };

    console.log('📤 [POST Botón Registrar Labor en Terreno (HU02)] Enviando CrearLaborDto:', dto);

    // Enviar a la API de backend NestJS
    this.erpService.registrarLaborApi(dto).subscribe({
      next: (resApi) => {
        console.log('📥 [POST Registrar Labor HU02] Respuesta de API recibida:', resApi);
      },
      error: (errApi) => {
        console.warn('⚠️ [POST Registrar Labor HU02] Notificación de API:', errApi);
      }
    });

    // Actualizar estado reactivo local del ERP
    this.erpService.registrarLabor({
      id_ciclo: idCiclo,
      tipo_labor: val.tipo_labor,
      fecha_ejecucion: val.fecha_ejecucion,
      horas_dedicadas: Number(val.horas_dedicadas),
      id_usuario_responsable: currentUser?.id_usuario || 2,
      nombre_responsable: currentUser?.nombre_completo || 'Agrónomo',
      observaciones_tecnicas: val.observaciones_tecnicas,
      id_insumo_utilizado: val.id_insumo_utilizado ? Number(val.id_insumo_utilizado) : undefined,
      cantidad_insumo_utilizado: val.cantidad_insumo_utilizado ? Number(val.cantidad_insumo_utilizado) : undefined
    });

    this.mensajeExito.set(`Labor de ${val.tipo_labor} registrada exitosamente.`);
    this.laborForm.patchValue({
      id_insumo_utilizado: '',
      cantidad_insumo_utilizado: null,
      observaciones_tecnicas: ''
    });
  }
}
