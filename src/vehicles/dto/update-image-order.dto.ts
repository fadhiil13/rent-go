import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateImageOrderDto {
  @ApiProperty({ example: 0, description: 'Urutan gambar (0 = pertama)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order: number;
}