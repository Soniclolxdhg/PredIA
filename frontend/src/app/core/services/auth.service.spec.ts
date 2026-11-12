import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AUTH_ENDPOINTS } from '../constants/auth.endpoints';
import { environment } from '../../../environments/environment';

describe('AuthService (Seguridad & Sesión)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Limpiar sessionStorage antes de cada prueba
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('debe inicializarse sin sesión previa (campos vacíos)', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(service.userRole()).toBeNull();
  });

  it('debe almacenar token y usuario en sessionStorage tras login exitoso', () => {
    const mockResponse = {
      accessToken: 'jwt_mock_token_123',
      usuario: {
        idUsuario: 1,
        nombreCompleto: 'Rodrigo Vega',
        rut: '11.111.111-1',
        email: 'admin@predia.cl',
        rol: 'ADMINISTRADOR' as const,
        activo: true
      }
    };

    service.login({ email: 'admin@predia.cl', password: 'Password123!' }).subscribe((res) => {
      expect(res.accessToken).toBe('jwt_mock_token_123');
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.userRole()).toBe('ADMINISTRADOR');
      expect(service.currentUser()?.nombre_completo).toBe('Rodrigo Vega');

      // Verifica que esté en sessionStorage, NO en localStorage
      expect(sessionStorage.getItem('predia_tab_token')).toBe('jwt_mock_token_123');
      expect(localStorage.getItem('predia_tab_token')).toBeNull();
      expect(localStorage.getItem('predia_token')).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    // Al iniciar sesión, AuthService dispara la carga de usuarios reales
    const reqUsuarios = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.USUARIOS}`);
    expect(reqUsuarios.request.method).toBe('GET');
    reqUsuarios.flush([mockResponse.usuario]);
  });

  it('debe manejar error 409 Conflict al registrar usuario sin agregarlo a la lista local', () => {
    const dto = {
      nombre_completo: 'Yamil Briceño',
      rut: '21.340.502-0',
      email: 'foxisonicyamil@gmail.com',
      rol: 'AGRONOMO' as const
    };

    const usuariosIniciales = service.usuarios().length;

    service.crearUsuario(dto).subscribe((res) => {
      expect(res.exito).toBeFalse();
      expect(res.mensaje).toContain('ya se encuentra registrado');
      // No debió agregarse al estado local
      expect(service.usuarios().length).toBe(usuariosIniciales);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.REGISTRO}`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'El correo electrónico o RUT ya se encuentra registrado en el sistema.' }, { status: 409, statusText: 'Conflict' });
  });

  it('debe informar con claridad error 404 al intentar actualizar usuario si el endpoint no existe', () => {
    service.actualizarUsuario(5, { nombreCompleto: 'Nombre Editado' }).subscribe((res) => {
      expect(res.exito).toBeFalse();
      expect(res.mensaje).toContain('PATCH /api/auth/usuarios/5');
      expect(res.mensaje).toContain('aún no está implementado');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${AUTH_ENDPOINTS.USUARIO_POR_ID(5)}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('debe limpiar toda la sesión y señales al ejecutar logout()', () => {
    sessionStorage.setItem('predia_tab_token', 'token_temporal');
    sessionStorage.setItem('predia_tab_user', JSON.stringify({ id_usuario: 1, email: 'test@predia.cl' }));

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('predia_tab_token')).toBeNull();
  });
});
