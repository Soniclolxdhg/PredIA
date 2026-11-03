import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly registrador = new Logger('AuditoriaISO27001');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const solicitudHttp = context.switchToHttp().getRequest();
    const { method: metodo, url, user: usuario, ip } = solicitudHttp;
    const agenteUsuario = solicitudHttp.get('user-agent') || 'desconocido';
    const marcaTiempo = new Date().toISOString();
    const tiempoInicio = Date.now();

    return next.handle().pipe(
      tap(() => {
        const respuestaHttp = context.switchToHttp().getResponse();
        const duracionMs = Date.now() - tiempoInicio;
        this.registrador.log(
          JSON.stringify({
            auditoria: 'ISO_27001',
            marcaTiempo,
            metodo,
            url,
            codigoEstado: respuestaHttp.statusCode,
            idUsuario: usuario?.id || 'anonimo',
            ip,
            agenteUsuario,
            duracionMs,
          }),
        );
      }),
    );
  }
}
