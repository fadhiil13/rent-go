import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Budi Santoso',
    description: 'Nama lengkap pengguna',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({
    example: '08123456789',
    description: 'Nomor telepon',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}