import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class RegisterDto {
  @ApiProperty({ example: 'Budi Santoso', description: 'Nama lengkap pengguna' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'budi@mail.com', description: 'Alamat email unik' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret123!', description: 'Password minimal 6 karakter' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '08123456789', description: 'Nomor telepon' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '3578010101900001', description: 'Nomor KTP / NIK (16 digit)' })
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