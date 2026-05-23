import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'budi@mail.com', description: 'Alamat email terdaftar' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret123!', description: 'Password akun' })
  @IsString()
  @MinLength(6)
  password: string;
}