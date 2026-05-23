import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateRentalDto {
  @ApiProperty({
    example: 'uuid-kendaraan',
    description: 'UUID kendaraan yang ingin disewa',
  })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({
    example: '2025-07-01T08:00:00.000Z',
    description: 'Tanggal mulai sewa (ISO 8601)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2025-07-04T08:00:00.000Z',
    description: 'Tanggal selesai sewa (ISO 8601)',
  })
  @IsDateString()
  endDate: string;
}