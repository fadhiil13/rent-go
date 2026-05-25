import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // GET /invoices  (admin)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Daftar semua invoice (admin)' })
  @ApiResponse({ status: 200, description: 'Daftar invoice berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  findAll() {
    return this.invoicesService.findAllAdmin();
  }

  // GET /invoices/rental/:rentalId
  @Get('rental/:rentalId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detail invoice berdasarkan rentalId' })
  @ApiResponse({ status: 200, description: 'Invoice ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Invoice belum ada' })
  findOneByRental(
    @CurrentUser() currentUser: JwtPayload,
    @Param('rentalId') rentalId: string,
  ) {
    return this.invoicesService.findOneByRental(currentUser, rentalId);
  }

  // POST /invoices/rental/:rentalId/generate  (admin, manual/cadangan)
  @Post('rental/:rentalId/generate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Generate invoice manual untuk rental (admin, idempotent)',
  })
  @ApiResponse({ status: 200, description: 'Invoice di-generate atau dikembalikan' })
  @ApiResponse({ status: 400, description: 'Belum ada pembayaran lunas' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  generate(@Param('rentalId') rentalId: string) {
    return this.invoicesService.generateForRental(rentalId);
  }
}