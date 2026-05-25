import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}