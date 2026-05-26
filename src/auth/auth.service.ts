import {
  BadRequestException,
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

// ── helper: strip password from any user object ───────────────────────────
function exclude(user: Record<string, any>) {
  const { password, ...safe } = user;
  return safe;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
    });

    return { message: 'Registrasi berhasil', data: user };
  }

  // ── login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = (await this.usersService.findByEmail(
      dto.email,
      true,
    )) as User | null;

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };
    const accessToken = this.jwtService.sign(payload);

    const { password: _pw, ...safeUser } = user;

    return {
      message: 'Login berhasil',
      data: { accessToken, user: safeUser },
    };
  }

  // ── me ────────────────────────────────────────────────────────────────────

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return { message: 'Profil berhasil diambil', data: user };
  }

  // ── updateProfile ─────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });

    return { message: 'Profil berhasil diperbarui', data: exclude(updated) };
  }

  // ── uploadAvatar ──────────────────────────────────────────────────────────

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const { url } = await this.cloudinaryService.uploadImage(file);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });

    return { message: 'Foto profil diperbarui', data: exclude(updated) };
  }
}