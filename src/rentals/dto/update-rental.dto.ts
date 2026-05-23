import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RentalStatus } from '@prisma/client';

export class UpdateRentalStatusDto {
  @ApiProperty({
    enum: RentalStatus,
    example: RentalStatus.CONFIRMED,
    description: 'Status rental baru',
  })
  @IsEnum(RentalStatus)
  status: RentalStatus;
}