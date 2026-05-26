import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST /reviews
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[USER] Buat review untuk rental yang sudah COMPLETED' })
  @ApiResponse({ status: 201, description: 'Review berhasil ditambahkan' })
  @ApiResponse({ status: 400, description: 'Rental belum selesai / sudah pernah direview' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik rental' })
  @ApiResponse({ status: 404, description: 'Rental tidak ditemukan' })
  create(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(currentUser, dto);
  }

  // GET /reviews (admin)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Daftar semua review' })
  @ApiResponse({ status: 200, description: 'Daftar review berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll() {
    return this.reviewsService.findAllAdmin();
  }

  // GET /reviews/my
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[USER] Lihat review yang pernah saya buat' })
  @ApiResponse({ status: 200, description: 'Review saya' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findMy(@CurrentUser() currentUser: JwtPayload) {
    return this.reviewsService.findMyReviews(currentUser);
  }

  // GET /reviews/vehicle/:vehicleId
  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Lihat semua review kendaraan + rata-rata rating (publik)' })
  @ApiParam({ name: 'vehicleId', description: 'UUID kendaraan' })
  @ApiResponse({ status: 200, description: 'Review kendaraan' })
  @ApiResponse({ status: 404, description: 'Kendaraan tidak ditemukan' })
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.reviewsService.findByVehicle(vehicleId);
  }

  // DELETE /reviews/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[USER] Hapus review milik sendiri / [ADMIN] hapus semua' })
  @ApiParam({ name: 'id', description: 'UUID review' })
  @ApiResponse({ status: 200, description: 'Review berhasil dihapus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Bukan pemilik review' })
  @ApiResponse({ status: 404, description: 'Review tidak ditemukan' })
  remove(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.reviewsService.remove(currentUser, id);
  }
}