import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogosService } from './catalogos.service';
import { ErpDataService } from './erp-data.service';

describe('CatalogosService', () => {
  let service: CatalogosService;
  let erpService: ErpDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogosService,
        ErpDataService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CatalogosService);
    erpService = TestBed.inject(ErpDataService);
  });

  it('debe inicializarse correctamente con estructuras, variedades y unidades de medida', () => {
    expect(service).toBeTruthy();
    expect(service.estructuras().length).toBeGreaterThan(0);
    expect(service.variedades().length).toBeGreaterThan(0);
    expect(service.unidadesMedida().length).toBeGreaterThan(0);
  });

  it('debe incluir las unidades agronómicas base requeridas (Kg, L, UNIDADES, SACO, BANDEJA)', () => {
    const simbolos = service.unidadesMedida().map((u) => u.simbolo);
    expect(simbolos).toContain('Kg');
    expect(simbolos).toContain('L');
    expect(simbolos).toContain('UNIDADES');
    expect(simbolos).toContain('SACO');
    expect(simbolos).toContain('BANDEJA');
  });

  it('debe rechazar la eliminación de estructuras o unidades con mensaje honesto si no hay endpoint en backend', (done) => {
    service.crearEstructura('Invernadero Test', 'Descripción Test').subscribe((res) => {
      expect(res.exito).toBeFalse();
      expect(res.mensaje).toContain('no está implementado en el backend');
      done();
    });
  });
});
