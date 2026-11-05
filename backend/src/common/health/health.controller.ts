import { Controller, Get } from '@nestjs/common';
import { ServicioPrisma } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: ServicioPrisma) {}

  @Get()
  async verificarSalud() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'conectada',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'desconectada',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

