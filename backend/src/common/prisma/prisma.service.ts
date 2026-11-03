import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ServicioPrisma extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly registrador = new Logger(ServicioPrisma.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.registrador.log('Conexión con PostgreSQL establecida correctamente.');
    } catch (error) {
      this.registrador.warn(
        'No se pudo conectar a PostgreSQL en el arranque. Verifique que Docker o la base de datos esté activa.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
