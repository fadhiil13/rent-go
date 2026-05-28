import { forwardRef, Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentInfoService } from './payment-info.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentInfoService],
  exports: [PaymentsService],
})
export class PaymentsModule {}