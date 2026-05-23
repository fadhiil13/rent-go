import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota Avanza', description: 'Nama kendaraan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.CAR, description: 'Tipe kendaraan' })
  @IsEnum(VehicleType)
  type: VehicleType;

  @ApiProperty({ example: 'Toyota', description: 'Merek kendaraan' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Avanza', description: 'Model kendaraan' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2022, description: 'Tahun produksi (1990-2100)' })
  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 'B 1234 ABC', description: 'Nomor plat unik' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ example: 350000, description: 'Harga sewa per hari (Rupiah)' })
  @IsNumber()
  @IsPositive()
  pricePerDay: number;

  @ApiPropertyOptional({
    enum: VehicleStatus,
    example: VehicleStatus.AVAILABLE,
    description: 'Status kendaraan (default: AVAILABLE)',
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({
    example: 'https://placehold.co/600x400',
    description: 'URL foto kendaraan',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'Mobil keluarga 7 penumpang, AC, kondisi prima.',
    description: 'Deskripsi kendaraan',
  })
  @IsOptional()
  @IsString()
  description?: string;
}