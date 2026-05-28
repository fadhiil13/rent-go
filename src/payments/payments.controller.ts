import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentMethod, Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @ApiOperation({ summary: 'Buat pembayaran — response include info rekening/QRIS sesuai method' })
  @ApiResponse({ status: 201, description: 'Pembayaran dibuat + info cara bayar' })
  @ApiResponse({ status: 400, description: 'Rental sudah dibatalkan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Pembayaran sudah dibuat' })
  create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(currentUser, dto);
  }

  // GET /payments (admin)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Daftar semua pembayaran' })
  @ApiResponse({ status: 200, description: 'Daftar pembayaran' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAllAdmin(query);
  }

  // GET /payments/info/:method (publik)
  @Get('info/:method')
  @ApiOperation({ summary: 'Info cara bayar berdasarkan method (rekening/QRIS/dll)' })
  @ApiParam({ name: 'method', enum: PaymentMethod })
  @ApiResponse({ status: 200, description: 'Info pembayaran' })
  getPaymentInfo(@Param('method') method: PaymentMethod) {
    return this.paymentsService.getPaymentInfo(method);
  }

  // GET /payments/rental/:rentalId
  @Get('rental/:rentalId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detail pembayaran berdasarkan rentalId' })
  @ApiResponse({ status: 200, description: 'Detail pembayaran' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Pembayaran belum ada' })
  findOneByRental(
    @CurrentUser() currentUser: JwtPayload,
    @Param('rentalId') rentalId: string,
  ) {
    return this.paymentsService.findOneByRental(currentUser, rentalId);
  }

  // POST /payments/:id/proof
  @Post(':id/proof')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload bukti pembayaran (struk/screenshot)' })
  @ApiResponse({ status: 200, description: 'Bukti diupload, menunggu konfirmasi admin' })
  @ApiResponse({ status: 400, description: 'File tidak ada / bukan gambar / >5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik payment' })
  @ApiResponse({ status: 404, description: 'Pembayaran tidak ditemukan' })
  uploadProof(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.paymentsService.uploadProof(currentUser, id, file);
  }

  // POST /payments/:id/confirm (admin)
  @Post(':id/confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Konfirmasi bukti pembayaran → status PAID' })
  @ApiResponse({ status: 200, description: 'Pembayaran dikonfirmasi' })
  @ApiResponse({ status: 400, description: 'Belum ada bukti / sudah PAID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Pembayaran tidak ditemukan' })
  confirmProof(@Param('id') id: string) {
    return this.paymentsService.confirmProof(id);
  }

  // POST /payments/:id/reject (admin)
  @Post(':id/reject')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Tolak bukti pembayaran → user upload ulang' })
  @ApiResponse({ status: 200, description: 'Bukti ditolak' })
  @ApiResponse({ status: 400, description: 'Belum ada bukti / sudah PAID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Pembayaran tidak ditemukan' })
  rejectProof(@Param('id') id: string) {
    return this.paymentsService.rejectProof(id);
  }

  // POST /payments/:id/pay (mock)
  @Post(':id/pay')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[MOCK] Konfirmasi pembayaran langsung tanpa bukti (untuk testing)' })
  @ApiResponse({ status: 200, description: 'Pembayaran berhasil (mock)' })
  @ApiResponse({ status: 400, description: 'Sudah lunas' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik payment' })
  @ApiResponse({ status: 404, description: 'Pembayaran tidak ditemukan' })
  pay(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.paymentsService.pay(currentUser, id);
  }
}