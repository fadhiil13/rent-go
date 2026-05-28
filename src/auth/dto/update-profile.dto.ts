import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from './register.dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Budi Santoso', description: 'Nama lengkap' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ example: '08123456789', description: 'Nomor telepon' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '3578010101900001', description: 'Nomor KTP / NIK' })
  @IsOptional()
  @IsString()
  nik?: string;

  @ApiPropertyOptional({ example: '1990-01-01', description: 'Tanggal lahir (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE, description: 'Jenis kelamin' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;

  @ApiPropertyOptional({ example: 'Jl. Raya No. 1, Surabaya', description: 'Alamat lengkap' })
  @IsOptional()
  @IsString()
  address?: string;
}