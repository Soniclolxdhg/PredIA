import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { CLIMA_ENDPOINTS } from '../constants/clima.endpoints';
import { VENTAS_ENDPOINTS } from '../constants/ventas.endpoints';
import { COSTOS_ENDPOINTS } from '../constants/costos.endpoints';
import { DASHBOARD_ENDPOINTS } from '../constants/dashboard.endpoints';

describe('authInterceptor y Endpoints', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken', 'baseUrl']);
    authServiceSpy.getToken.and.returnValue('fake-jwt-token');
    authServiceSpy.baseUrl.and.returnValue('https://predia-backend.onrender.com/api');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('debe adjuntar Bearer token en headers', () => {
    httpClient.get('/test').subscribe();
    const req = httpTestingController.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    req.flush({});
  });

  it('debe corregir y normalizar URLs con duplicidad /api/api/ a un solo /api/', () => {
    httpClient.get('https://predia-backend.onrender.com/api/api/ventas/clientes').subscribe();
    const req = httpTestingController.expectOne('https://predia-backend.onrender.com/api/ventas/clientes');
    expect(req.request.url).toBe('https://predia-backend.onrender.com/api/ventas/clientes');
    req.flush([]);
  });

  it('las constantes de clima, ventas, costos y dashboard no deben contener prefijo /api duplicado', () => {
    expect(CLIMA_ENDPOINTS.SINCRONIZAR).toBe('/clima/sincronizar');
    expect(VENTAS_ENDPOINTS.CLIENTES).toBe('/ventas/clientes');
    expect(COSTOS_ENDPOINTS.ASISTENCIAS).toBe('/costos/asistencias');
    expect(DASHBOARD_ENDPOINTS.EJECUTIVO).toBe('/dashboard/ejecutivo');

    const fullUrlClima = `${authServiceSpy.baseUrl()}${CLIMA_ENDPOINTS.SINCRONIZAR}`;
    expect(fullUrlClima).toBe('https://predia-backend.onrender.com/api/clima/sincronizar');

    const fullUrlVentas = `${authServiceSpy.baseUrl()}${VENTAS_ENDPOINTS.CLIENTES}`;
    expect(fullUrlVentas).toBe('https://predia-backend.onrender.com/api/ventas/clientes');
  });
});
