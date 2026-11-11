import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RolUsuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';

@Injectable()
export class AuthService {
  private readonly registrador = new Logger(AuthService.name);

  constructor(
    private readonly prisma: ServicioPrisma,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra un nuevo usuario con contraseña cifrada mediante Argon2id
   */
  async registrarUsuario(dto: RegistroDto) {
    const usuarioExistente = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: dto.email }, { rut: dto.rut }],
      },
    });

    if (usuarioExistente) {
      if (usuarioExistente.email === dto.email) {
        throw new ConflictException('El correo electrónico ya se encuentra registrado.');
      }
      throw new ConflictException('El RUT ya se encuentra registrado.');
    }

    try {
      const hashPassword = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });

      const nuevoUsuario = await this.prisma.usuario.create({
        data: {
          nombreCompleto: dto.nombreCompleto,
          rut: dto.rut,
          email: dto.email,
          hashPassword,
          rol: dto.rol ?? undefined,
        },
        select: {
          idUsuario: true,
          nombreCompleto: true,
          email: true,
          rut: true,
          rol: true,
          activo: true,
          fechaCreacion: true,
        },
      });

      return {
        mensaje: 'Usuario registrado exitosamente',
        usuario: nuevoUsuario,
      };
    } catch (error) {
      this.registrador.error('Error al registrar usuario', error);
      throw new InternalServerErrorException('Error al registrar usuario en el sistema.');
    }
  }

  /**
   * Autentica credenciales y emite token JWT
   */
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('La cuenta de usuario está desactivada.');
    }

    const passwordValida = await argon2.verify(usuario.hashPassword, dto.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = {
      sub: usuario.idUsuario,
      email: usuario.email,
      rol: usuario.rol,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      usuario: {
        idUsuario: usuario.idUsuario,
        nombreCompleto: usuario.nombreCompleto,
        email: usuario.email,
        rut: usuario.rut,
        rol: usuario.rol,
      },
    };
  }

  /**
   * Obtiene la lista de usuarios del sistema (excluyendo hashPassword)
   * Permite filtrar opcionalmente por rol y estado activo
   */
  async listarUsuarios(rol?: RolUsuario, activo?: boolean) {
    return this.prisma.usuario.findMany({
      where: {
        ...(rol ? { rol } : {}),
        ...(activo !== undefined ? { activo } : {}),
      },
      select: {
        idUsuario: true,
        nombreCompleto: true,
        email: true,
        rut: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
      },
      orderBy: {
        nombreCompleto: 'asc',
      },
    });
  }
}

