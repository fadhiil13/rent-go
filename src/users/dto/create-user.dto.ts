import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Budi Santoso', description: 'Nama lengkap pengguna' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'budi@example.com', description: 'Alamat email unik' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password minimal 6 karakter' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '081234567890', description: 'Nomor telepon' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
    description: 'Role pengguna (default: USER)',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
