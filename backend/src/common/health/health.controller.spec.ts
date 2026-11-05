import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { ServicioPrisma } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: ServicioPrisma,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe retornar status ok si la base de datos responde', async () => {
    const res = await controller.verificarSalud();
    expect(res.status).toBe('ok');
    expect(res.database).toBe('conectada');
    expect(res.timestamp).toBeDefined();
  });

  it('debe retornar status error si la base de datos falla', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Conexión fallida'));
    const res = await controller.verificarSalud();
    expect(res.status).toBe('error');
    expect(res.database).toBe('desconectada');
  });
});

