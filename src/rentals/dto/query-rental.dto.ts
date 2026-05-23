import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RentalStatus } from '@prisma/client';

export class QueryRentalDto {
  @ApiPropertyOptional({
    enum: RentalStatus,
    description: 'Filter berdasarkan status rental',
  })
  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus;
}