import {
  BadRequestException,
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Gender, Role, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

function exclude(user: Record<string, any>) {
  const { password, avatarPublicId, ...safe } = user;
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
    if (existing) throw new ConflictException('Email sudah terdaftar');

    if (dto.nik) {
      const nikExist = await this.prisma.user.findUnique({ where: { nik: dto.nik } });
      if (nikExist) throw new ConflictException('NIK sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.nik && { nik: dto.nik }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender && { gender: dto.gender as Gender }),
        ...(dto.address && { address: dto.address }),
      },
    });

    return { message: 'Registrasi berhasil', data: exclude(user) };
  }

  // ── login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = (await this.usersService.findByEmail(dto.email, true)) as User | null;
    if (!user) throw new UnauthorizedException('Email atau password salah');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email atau password salah');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    };
    const accessToken = this.jwtService.sign(payload);
    const { password: _pw, avatarPublicId: _pub, ...safeUser } = user as any;

    return { message: 'Login berhasil', data: { accessToken, user: safeUser } };
  }

  // ── me ────────────────────────────────────────────────────────────────────

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return { message: 'Profil berhasil diambil', data: exclude(user) };
  }

  // ── updateProfile ─────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    if (dto.nik && dto.nik !== existing.nik) {
      const conflict = await this.prisma.user.findUnique({ where: { nik: dto.nik } });
      if (conflict) throw new ConflictException('NIK sudah terdaftar oleh akun lain');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.nik !== undefined && { nik: dto.nik }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender !== undefined && { gender: dto.gender as Gender }),
        ...(dto.address !== undefined && { address: dto.address }),
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

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const { url } = await this.cloudinaryService.uploadImage(file);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });

    return { message: 'Foto profil diperbarui', data: exclude(updated) };
  }
}