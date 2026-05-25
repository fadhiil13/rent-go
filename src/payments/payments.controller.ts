import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { PaymentsService } from './payments.service';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /payments
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buat pembayaran untuk rental' })
  @ApiResponse({ status: 201, description: 'Pembayaran berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Rental sudah dibatalkan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Pembayaran sudah dibuat' })
  create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(currentUser, dto);
  }

  // GET /payments  (admin — harus sebelum /:id supaya tidak conflict)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Daftar semua pembayaran (admin)' })
  @ApiResponse({ status: 200, description: 'Daftar pembayaran berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  // GET /payments/rental/:rentalId
  @Get('rental/:rentalId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detail pembayaran berdasarkan rentalId' })
  @ApiResponse({ status: 200, description: 'Detail pembayaran ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Pembayaran belum ada' })
  findOneByRental(
    @CurrentUser() currentUser: JwtPayload,
    @Param('rentalId') rentalId: string,
  ) {
    return this.paymentsService.findOneByRental(currentUser, rentalId);
  }

  // POST /payments/:id/pay
  @Post(':id/pay')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Konfirmasi pembayaran (mock)' })
  @ApiResponse({ status: 200, description: 'Pembayaran berhasil dikonfirmasi' })
  @ApiResponse({ status: 400, description: 'Pembayaran sudah lunas' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan pemilik payment' })
  @ApiResponse({ status: 404, description: 'Pembayaran tidak ditemukan' })
  pay(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.paymentsService.pay(currentUser, id);
  }
}