import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { Gender, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private exclude(user: User): SafeUser {
    const { password: _pw, ...safe } = user;
    return safe;
  }

  private sanitize(user: any) {
    const { password: _pw, avatarPublicId: _pub, ...rest } = user;
    return rest;
  }

  // =====================================================
  //  METHOD LAMA — dipakai AuthService
  // =====================================================

  async findByEmail(email: string, includePassword = false): Promise<User | SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || includePassword) return user;
    return this.exclude(user);
  }

  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.exclude(user);
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: Role;
  }): Promise<SafeUser> {
    const user = await this.prisma.user.create({ data });
    return this.exclude(user);
  }

  // =====================================================
  //  USER — profil sendiri
  // =====================================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return { message: 'Profil berhasil dimuat', data: this.sanitize(user) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    if (dto.nik) {
      const nikConflict = await this.prisma.user.findUnique({ where: { nik: dto.nik } });
      if (nikConflict && nikConflict.id !== userId) {
        throw new ConflictException('NIK sudah terdaftar oleh akun lain');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.nik !== undefined && { nik: dto.nik }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender !== undefined && { gender: dto.gender as Gender }),
      },
    });

    return { message: 'Profil berhasil diperbarui', data: this.sanitize(updated) };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const { url, publicId } = await this.cloudinaryService.uploadImage(file);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: url,
        avatarPublicId: publicId,
      },
    });

    return {
      message: 'Foto profil berhasil diperbarui',
      data: { avatarUrl: updated.avatarUrl },
    };
  }

  async deleteAvatar(userId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    // Hapus dari Cloudinary jika ada publicId
    const pub = (existing as any).avatarPublicId;
    if (pub) {
      try {
        await cloudinary.uploader.destroy(pub);
      } catch {
        // ignore jika gagal hapus di cloudinary
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null, avatarPublicId: null },
    });

    return { message: 'Foto profil berhasil dihapus', data: null };
  }

  // =====================================================
  //  ADMIN
  // =====================================================

  async findAllAdmin(query: QueryUserDto) {
    const { role, search, page = 1, limit = 10 } = query;

    const where: Prisma.UserWhereInput = {
      ...(role !== undefined && { role }),
      ...(search !== undefined && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatarUrl: true,
          address: true,
          nik: true,
          dateOfBirth: true,
          gender: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      message: 'Daftar pengguna',
      data: {
        items,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async findOneAdmin(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        address: true,
        nik: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    return { message: 'Detail pengguna', data: user };
  }

  async createByAdmin(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
    });

    return { message: 'Pengguna dibuat', data: this.exclude(user) };
  }

  async updateByAdmin(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

    if (dto.email !== undefined && dto.email !== existing.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email sudah terdaftar');
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.role !== undefined && { role: dto.role }),
    };

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({ where: { id }, data });

    return { message: 'Pengguna diperbarui', data: this.exclude(updated) };
  }

  async removeByAdmin(currentUserId: string, id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pengguna tidak ditemukan');

    if (id === currentUserId) {
      throw new BadRequestException('Tidak bisa menghapus akun sendiri');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException('User memiliki riwayat sewa, tidak bisa dihapus');
      }
      throw err;
    }

    return { message: 'Pengguna dihapus', data: null };
  }
}