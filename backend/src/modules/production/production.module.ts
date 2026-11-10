import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { ModuloPrisma } from '../../common/prisma/prisma.module';

/**
 * Módulo de Producción y Gestión de Invernaderos (HU01).
 * Conecta los controladores de Naves y Ciclos con la base de datos de Supabase.
 */
@Module({
  imports: [ModuloPrisma],
  controllers: [ProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
