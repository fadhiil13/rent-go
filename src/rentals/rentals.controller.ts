import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { QueryRentalDto } from './dto/query-rental.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Rentals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  // ── POST /rentals (USER only) ──────────────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[USER] Buat rental baru — totalPrice dihitung otomatis' })
  @ApiResponse({ status: 201, description: 'Rental berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Tanggal tidak valid / kendaraan tidak tersedia' })
  @ApiResponse({ status: 403, description: 'Hanya USER yang boleh membuat rental' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRentalDto,
  ) {
    return this.rentalsService.create(userId, dto);
  }

  // ── GET /rentals (Login) ───────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Ambil daftar rental — USER hanya miliknya, ADMIN semua',
  })
  @ApiResponse({ status: 200, description: 'Daftar rental berhasil diambil' })
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query() query: QueryRentalDto,
  ) {
    return this.rentalsService.findAll(currentUser, query);
  }

  // ── GET /rentals/:id (Login) ───────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail rental — USER hanya miliknya (403 jika bukan)' })
  @ApiParam({ name: 'id', description: 'UUID rental' })
  @ApiResponse({ status: 200, description: 'Detail rental ditemukan' })
  @ApiResponse({ status: 403, description: 'Bukan rental milik Anda' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  async findOne(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.rentalsService.findOne(currentUser, id);
  }

  // ── PATCH /rentals/:id/status (ADMIN only) ─────────────────────────────────
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Ubah status rental' })
  @ApiParam({ name: 'id', description: 'UUID rental' })
  @ApiResponse({ status: 200, description: 'Status rental berhasil diperbarui' })
  @ApiResponse({ status: 403, description: 'Hanya ADMIN yang boleh mengubah status' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRentalStatusDto,
  ) {
    return this.rentalsService.updateStatus(id, dto);
  }

  // ── PATCH /rentals/:id/complete (ADMIN only) ───────────────────────────────
  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Selesaikan rental — vehicle kembali AVAILABLE' })
  @ApiParam({ name: 'id', description: 'UUID rental' })
  @ApiResponse({ status: 200, description: 'Rental berhasil diselesaikan' })
  @ApiResponse({ status: 400, description: 'Transisi status tidak valid / pembayaran belum lunas' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  async complete(@Param('id') id: string) {
    return this.rentalsService.complete(id);
  }
  
  // ── PATCH /rentals/:id/cancel (USER & ADMIN) ───────────────────────────────
@Patch(':id/cancel')
@ApiOperation({ summary: '[USER] Batalkan rental — hanya jika masih PENDING' })
@ApiParam({ name: 'id', description: 'UUID rental' })
@ApiResponse({ status: 200, description: 'Rental berhasil dibatalkan' })
@ApiResponse({ status: 400, description: 'Status tidak bisa dibatalkan' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Bukan rental milik Anda' })
@ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
async cancel(
  @CurrentUser() currentUser: JwtPayload,
  @Param('id') id: string,
) {
  return this.rentalsService.cancel(currentUser, id);
}


}