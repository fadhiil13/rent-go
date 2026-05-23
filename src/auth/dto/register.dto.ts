import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: '08123456789', description: 'Nomor telepon (opsional)' })
  @IsOptional()
  @IsString()
  phone?: string;
}