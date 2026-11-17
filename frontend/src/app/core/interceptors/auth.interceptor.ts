import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor funcional que:
 * 1. Adjunta automáticamente el token Bearer a las peticiones HTTP salientes cuando el usuario ha iniciado sesión.
 * 2. Sanitiza la URL para prevenir duplicidad accidental de prefijo (ej. /api/api/ -> /api/).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Sanitizar URL ante cualquier duplicidad de prefijo /api/
  let sanitizedUrl = req.url;
  if (sanitizedUrl.includes('/api/api/')) {
    sanitizedUrl = sanitizedUrl.replace(/\/api\/api\//g, '/api/');
  }

  const headersConfig: Record<string, string> = {};
  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }

  const cloned = req.clone({
    url: sanitizedUrl,
    setHeaders: headersConfig
  });

  return next(cloned);
};

