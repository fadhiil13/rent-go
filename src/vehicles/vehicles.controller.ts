import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ── GET /vehicles (PUBLIK) ─────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Ambil daftar kendaraan dengan filter & pagination' })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan berhasil diambil' })
  async findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  // ── GET /vehicles/:id (PUBLIK) ─────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail kendaraan berdasarkan ID' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Detail kendaraan ditemukan' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  // ── POST /vehicles (ADMIN) ─────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN] Tambah kendaraan baru' })
  @ApiResponse({ status: 201, description: 'Kendaraan berhasil ditambahkan' })
  @ApiResponse({ status: 409, description: 'Nomor plat sudah terdaftar' })
  @ApiResponse({ status: 401, description: 'Belum login' })
  @ApiResponse({ status: 403, description: 'Bukan ADMIN' })
  async create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  // ── PATCH /vehicles/:id (ADMIN) ────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Perbarui data kendaraan' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Kendaraan berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Nomor plat sudah digunakan' })
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  // ── DELETE /vehicles/:id (ADMIN) ───────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Hapus kendaraan' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Kendaraan berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}