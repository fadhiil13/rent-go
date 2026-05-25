import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID rental yang akan dibayar',
  })
  @IsUUID()
  rentalId: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.TRANSFER,
    description: 'Metode pembayaran (default: TRANSFER)',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}