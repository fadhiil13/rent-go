  import { Module } from '@nestjs/common';
  import { ConfigModule } from '@nestjs/config';
  import { PrismaModule } from './prisma/prisma.module';
  import { AuthModule } from './auth/auth.module';
  import { UsersModule } from './users/users.module';
  import { VehiclesModule } from './vehicles/vehicles.module';
  import { RentalsModule } from './rentals/rentals.module';
  import { PaymentsModule } from './payments/payments.module';
  import { InvoicesModule } from './invoices/invoices.module';
  import { DashboardModule } from './dashboard/dashboard.module';




  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      PrismaModule,
      UsersModule,
      AuthModule,
      VehiclesModule,
      RentalsModule,
      PaymentsModule,
      InvoicesModule,
      DashboardModule,
      
    ],
  })
  export class AppModule {}