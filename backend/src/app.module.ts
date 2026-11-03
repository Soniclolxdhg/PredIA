import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { ModuloPrisma } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductionModule } from './modules/production/production.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CostLaborModule } from './modules/cost-labor/cost-labor.module';
import { CostingEngineModule } from './modules/costing-engine/costing-engine.module';
import { SalesModule } from './modules/sales/sales.module';
import { WeatherModule } from './modules/weather/weather.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ModuloPrisma,
    AuthModule,
    ProductionModule,
    InventoryModule,
    CostLaborModule,
    CostingEngineModule,
    SalesModule,
    WeatherModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
