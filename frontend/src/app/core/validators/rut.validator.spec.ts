import { FormControl } from '@angular/forms';
import { rutChilenoValidator, formatearRutChileno, limpiarRut, validarRutChileno } from './rut.validator';

describe('RUT Chileno Validator (Módulo 11)', () => {
  it('debe validar correctamente RUTs chilenos válidos', () => {
    const validos = [
      '11.111.111-1',
      '11111111-1',
      '21.340.502-0',
      '213405020',
      '15.222.333-1',
      '12.444.555-8',
      '76.123.456-0',
      '30.686.957-4'
    ];

    validos.forEach((rut) => {
      const control = new FormControl(rut);
      const res = rutChilenoValidator(control);
      expect(res).toBeNull(`El RUT ${rut} debió ser considerado válido`);
      expect(validarRutChileno(rut)).toBeTrue();
    });
  });

  it('debe rechazar RUTs con dígito verificador incorrecto', () => {
    const invalidos = [
      '11.111.111-2',
      '21.340.502-9',
      '15.222.333-4',
      '12.444.555-6',
      '76.123.456-7'
    ];

    invalidos.forEach((rut) => {
      const control = new FormControl(rut);
      const res = rutChilenoValidator(control);
      expect(res).toEqual({ rutInvalido: true }, `El RUT ${rut} debió ser rechazado`);
      expect(validarRutChileno(rut)).toBeFalse();
    });
  });

  it('debe rechazar RUTs con formato incompleto o caracteres inválidos', () => {
    const formatosInvalidos = ['', '123', 'abc', '12345678-Z', '12.34.56'];

    formatosInvalidos.forEach((rut) => {
      const control = new FormControl(rut);
      const res = rutChilenoValidator(control);
      if (!rut) {
        expect(res).toBeNull();
      } else {
        expect(res).toEqual({ rutInvalido: true });
      }
    });
  });

  it('debe limpiar puntos y guiones correctamente con limpiarRut', () => {
    expect(limpiarRut('21.340.502-0')).toBe('213405020');
    expect(limpiarRut(' 11.111.111-1 ')).toBe('111111111');
    expect(limpiarRut('12.345.678-k')).toBe('12345678K');
  });

  it('debe formatear un RUT sin puntos con formatearRutChileno', () => {
    expect(formatearRutChileno('213405020')).toBe('21.340.502-0');
    expect(formatearRutChileno('111111111')).toBe('11.111.111-1');
    expect(formatearRutChileno('21.340.502-0')).toBe('21.340.502-0');
  });
});
