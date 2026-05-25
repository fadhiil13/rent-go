import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private exclude(user: User): SafeUser {
    const { password: _pw, ...safe } = user;
    return safe;
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
  //  METHOD BARU — ADMIN
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
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    return { message: 'Detail pengguna', data: user };
  }

  async createByAdmin(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
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
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
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
        throw new ConflictException(
          'User memiliki riwayat sewa, tidak bisa dihapus',
        );
      }
      throw err;
    }

    return { message: 'Pengguna dihapus', data: null };
  }
}