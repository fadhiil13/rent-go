import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users
  @Get()
  @ApiOperation({ summary: 'Daftar semua pengguna (admin)' })
  @ApiResponse({ status: 200, description: 'Daftar pengguna berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAllAdmin(query);
  }

  // GET /users/:id
  @Get(':id')
  @ApiOperation({ summary: 'Detail pengguna berdasarkan ID (admin)' })
  @ApiResponse({ status: 200, description: 'Detail pengguna ditemukan' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOneAdmin(id);
  }

  // POST /users
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Buat pengguna baru (admin)' })
  @ApiResponse({ status: 201, description: 'Pengguna berhasil dibuat' })
  @ApiResponse({ status: 400, description: 'Validasi gagal' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 409, description: 'Email sudah terdaftar' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  // PATCH /users/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Update data pengguna (admin)' })
  @ApiResponse({ status: 200, description: 'Pengguna berhasil diperbarui' })
  @ApiResponse({ status: 400, description: 'Validasi gagal' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'Email sudah terdaftar oleh user lain' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateByAdmin(id, dto);
  }

  // DELETE /users/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Hapus pengguna (admin)' })
  @ApiResponse({ status: 200, description: 'Pengguna berhasil dihapus' })
  @ApiResponse({ status: 400, description: 'Tidak bisa menghapus akun sendiri' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan' })
  @ApiResponse({ status: 409, description: 'User memiliki riwayat sewa' })
  remove(
    @CurrentUser('sub') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.removeByAdmin(currentUserId, id);
  }
}