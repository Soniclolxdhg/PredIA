import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validador oficial de RUT chileno basado en el algoritmo Módulo 11.
 * Soporta formatos: 12.345.678-9, 12345678-9, 123456789, etc.
 */
export function validarRutChileno(rutCompleto: string): boolean {
  if (!rutCompleto || typeof rutCompleto !== 'string') return false;

  // Limpiar puntos, guiones y espacios
  const limpio = rutCompleto.replace(/[\.\-\s]/g, '').toUpperCase();
  if (limpio.length < 7 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  // El cuerpo debe componerse estrictamente de dígitos numéricos
  if (!/^\d+$/.test(cuerpo)) return false;

  // Cálculo del dígito verificador mediante Módulo 11
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += multiplo * parseInt(cuerpo[i], 10);
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }

  const resto = suma % 11;
  const dvEsperado = 11 - resto;

  let dvCalculado = '';
  if (dvEsperado === 11) dvCalculado = '0';
  else if (dvEsperado === 10) dvCalculado = 'K';
  else dvCalculado = dvEsperado.toString();

  return dv === dvCalculado;
}

/**
 * Formatea un RUT a la notación oficial chilena (ej. '213405020' -> '21.340.502-0')
 */
export function formatearRutChileno(rut: string): string {
  if (!rut) return '';
  const limpio = rut.replace(/[\.\-\s]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Validador para Formularios Reactivos de Angular
 */
export function rutChilenoValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const esValido = validarRutChileno(control.value);
  return esValido ? null : { rutInvalido: true };
}

