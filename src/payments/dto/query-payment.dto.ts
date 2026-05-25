import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class QueryPaymentDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter berdasarkan status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}