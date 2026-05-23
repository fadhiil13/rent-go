import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/register ────────────────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Daftar akun baru (role default USER)' })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil' })
  @ApiResponse({ status: 409, description: 'Email sudah terdaftar' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── POST /auth/login ───────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan JWT access token' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan accessToken' })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── GET /auth/me ───────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ambil profil user yang sedang login' })
  @ApiResponse({ status: 200, description: 'Profil berhasil diambil' })
  @ApiResponse({ status: 401, description: 'Token tidak valid atau expired' })
  async me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }

  // ── GET /auth/admin-test (SEMENTARA - hapus setelah RBAC dikonfirmasi) ────
  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[TEST SEMENTARA] Endpoint khusus ADMIN' })
  @ApiResponse({ status: 200, description: 'Akses ADMIN berhasil' })
  @ApiResponse({ status: 401, description: 'Belum login / token tidak valid' })
  @ApiResponse({ status: 403, description: 'Bukan ADMIN' })
  adminTest() {
    return { message: 'RBAC OK', data: { ok: true } };
  }
}