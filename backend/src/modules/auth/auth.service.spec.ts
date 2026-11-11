import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ServicioPrisma } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    usuario: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ServicioPrisma, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@predia.cl', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario está inactivo', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        idUsuario: 1,
        email: 'inactivo@predia.cl',
        activo: false,
        hashPassword: 'hash',
      });

      await expect(
        service.login({ email: 'inactivo@predia.cl', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe retornar accessToken y datos del usuario si las credenciales son válidas', async () => {
      const passwordTextoPlano = 'AdminPredIA2026!';
      const hash = await argon2.hash(passwordTextoPlano);

      prisma.usuario.findUnique.mockResolvedValue({
        idUsuario: 1,
        email: 'admin@predia.cl',
        nombreCompleto: 'Administrador General',
        rut: '11.111.111-1',
        rol: 'ADMINISTRADOR',
        activo: true,
        hashPassword: hash,
      });

      jwtService.signAsync.mockResolvedValue('jwt-token-simulado');

      const resultado = await service.login({
        email: 'admin@predia.cl',
        password: passwordTextoPlano,
      });

      expect(resultado.accessToken).toBe('jwt-token-simulado');
      expect(resultado.usuario.email).toBe('admin@predia.cl');
      expect(resultado.usuario.rol).toBe('ADMINISTRADOR');
    });
  });

  describe('listarUsuarios', () => {
    it('debe retornar la lista de usuarios excluyendo hashPassword', async () => {
      const usuariosSimulados = [
        {
          idUsuario: 1,
          nombreCompleto: 'Administrador General',
          email: 'admin@predia.cl',
          rut: '11.111.111-1',
          rol: 'ADMINISTRADOR',
          activo: true,
          fechaCreacion: new Date(),
        },
        {
          idUsuario: 2,
          nombreCompleto: 'Juan Agrónomo',
          email: 'juan@predia.cl',
          rut: '22.222.222-2',
          rol: 'AGRONOMO',
          activo: true,
          fechaCreacion: new Date(),
        },
      ];

      prisma.usuario.findMany.mockResolvedValue(usuariosSimulados);

      const resultado = await service.listarUsuarios();
      expect(resultado).toHaveLength(2);
      expect(resultado[0].nombreCompleto).toBe('Administrador General');
      expect(prisma.usuario.findMany).toHaveBeenCalled();
    });
  });
});

