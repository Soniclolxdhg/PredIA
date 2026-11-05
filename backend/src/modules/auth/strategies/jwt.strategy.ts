import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ServicioPrisma } from '../../../common/prisma/prisma.service';

export interface CargaJwt {
  sub: number;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: ServicioPrisma) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'predia-super-secret-jwt-key-change-in-production-2026',
    });
  }

  async validate(payload: CargaJwt) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { idUsuario: payload.sub },
      select: {
        idUsuario: true,
        nombreCompleto: true,
        email: true,
        rut: true,
        rol: true,
        activo: true,
      },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no autorizado o inactivo.');
    }

    return usuario;
  }
}

