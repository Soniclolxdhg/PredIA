import { Global, Module } from '@nestjs/common';
import { ServicioPrisma } from './prisma.service';

@Global()
@Module({
  providers: [ServicioPrisma],
  exports: [ServicioPrisma],
})
export class ModuloPrisma {}
