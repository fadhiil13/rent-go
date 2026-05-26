import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class QueryVehicleDto {
  @ApiPropertyOptional({ enum: VehicleType, description: 'Filter berdasarkan tipe kendaraan' })
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiPropertyOptional({ enum: VehicleStatus, description: 'Filter berdasarkan status kendaraan' })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({
    example: 'Surabaya',
    description: 'Filter berdasarkan kota lokasi kendaraan',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'toyota', description: 'Cari berdasarkan nama, merek, atau model' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Halaman (default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Jumlah item per halaman (default: 10, max: 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}