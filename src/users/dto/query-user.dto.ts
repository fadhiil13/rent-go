import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class QueryUserDto {
  @ApiPropertyOptional({ enum: Role, description: 'Filter berdasarkan role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description: 'Cari berdasarkan nama atau email',
    example: 'budi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Halaman (default: 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Jumlah item per halaman (default: 10, max: 100)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}