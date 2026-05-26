import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { VehiclesService } from './vehicles.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { UpdateImageOrderDto } from './dto/update-image-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── GET /vehicles (PUBLIK) ─────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Ambil daftar kendaraan dengan filter & pagination' })
  @ApiResponse({ status: 200, description: 'Daftar kendaraan berhasil diambil' })
  async findAll(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findAll(query);
  }

  // ── POST /vehicles/upload (ADMIN) ──────────────────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: '[ADMIN] Upload gambar ke Cloudinary (dapat url & publicId)' })
  @ApiResponse({ status: 201, description: 'Upload berhasil' })
  @ApiResponse({ status: 400, description: 'File tidak ada / bukan gambar / >5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }
    const { url, publicId } = await this.cloudinaryService.uploadImage(file);
    return { message: 'Upload berhasil', data: { url, publicId } };
  }

  // ── GET /vehicles/:id (PUBLIK) ─────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail kendaraan + semua gambar' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Detail kendaraan ditemukan' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  // ── POST /vehicles/:id/image (ADMIN) — foto utama ──────────────────────────
  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: '[ADMIN] Upload & set foto utama kendaraan' })
  @ApiResponse({ status: 200, description: 'Foto utama diperbarui' })
  @ApiResponse({ status: 400, description: 'File tidak ada / bukan gambar / >5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async uploadVehicleImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }
    await this.vehiclesService.findOne(id);
    const { url } = await this.cloudinaryService.uploadImage(file);
    const updated = await this.vehiclesService.update(id, { imageUrl: url });
    return { message: 'Gambar kendaraan diperbarui', data: updated.data };
  }

  // ── POST /vehicles/:id/images (ADMIN) — tambah ke galeri ──────────────────
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: '[ADMIN] Tambah gambar ke galeri kendaraan' })
  @ApiResponse({ status: 201, description: 'Gambar ditambahkan ke galeri' })
  @ApiResponse({ status: 400, description: 'File tidak ada / bukan gambar / >5MB' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async addImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }
    const { url, publicId } = await this.cloudinaryService.uploadImage(file);
    return this.vehiclesService.addImage(id, url, publicId);
  }

  // ── GET /vehicles/:id/images (PUBLIK) ─────────────────────────────────────
  @Get(':id/images')
  @ApiOperation({ summary: 'Ambil semua gambar galeri kendaraan' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Daftar gambar' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  async findImages(@Param('id') id: string) {
    return this.vehiclesService.findImages(id);
  }

  // ── DELETE /vehicles/:id/images/:imageId (ADMIN) ───────────────────────────
  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Hapus gambar dari galeri kendaraan' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiParam({ name: 'imageId', description: 'UUID gambar' })
  @ApiResponse({ status: 200, description: 'Gambar berhasil dihapus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Gambar tidak ditemukan' })
  async removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.vehiclesService.removeImage(id, imageId);
  }

  // ── PATCH /vehicles/:id/images/:imageId (ADMIN) — update urutan ───────────
  @Patch(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[ADMIN] Update urutan gambar galeri' })
  @ApiParam({ name: 'id', description: 'UUID kendaraan' })
  @ApiParam({ name: 'imageId', description: 'UUID gambar' })
  @ApiResponse({ status: 200, description: 'Urutan gambar diperbarui' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Gambar tidak ditemukan' })
  async updateImageOrder(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateImageOrderDto,
  ) {
    return this.vehiclesService.updateImageOrder(id, imageId, dto.order);
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