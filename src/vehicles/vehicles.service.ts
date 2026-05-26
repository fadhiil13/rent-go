import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private toPlain(vehicle: Record<string, unknown>) {
    return {
      ...vehicle,
      pricePerDay: Number(vehicle.pricePerDay),
    };
  }

  async findAll(query: QueryVehicleDto) {
    const { type, status, location, search, page = 1, limit = 10 } = query;

    const where: Prisma.VehicleWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;

    // Filter lokasi — contains agar "Jakarta" cocok dengan "Jakarta Selatan"
    if (location) {
      where.location = { contains: location };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      message: 'Daftar kendaraan',
      data: {
        items: items.map((v) => this.toPlain(v as unknown as Record<string, unknown>)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });

    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan');
    }

    return {
      message: 'Detail kendaraan',
      data: this.toPlain(vehicle as unknown as Record<string, unknown>),
    };
  }

  async create(dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { plateNumber: dto.plateNumber },
    });
    if (existing) {
      throw new ConflictException('Nomor plat sudah terdaftar');
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        name: dto.name,
        type: dto.type,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plateNumber: dto.plateNumber,
        pricePerDay: dto.pricePerDay,
        status: dto.status,
        location: dto.location,       // ← tambah
        imageUrl: dto.imageUrl,
        description: dto.description,
      },
    });

    return {
      message: 'Kendaraan berhasil ditambahkan',
      data: this.toPlain(vehicle as unknown as Record<string, unknown>),
    };
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);

    if (dto.plateNumber) {
      const conflict = await this.prisma.vehicle.findUnique({
        where: { plateNumber: dto.plateNumber },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Nomor plat sudah digunakan kendaraan lain');
      }
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.plateNumber !== undefined && { plateNumber: dto.plateNumber }),
        ...(dto.pricePerDay !== undefined && { pricePerDay: dto.pricePerDay }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.location !== undefined && { location: dto.location }),   // ← tambah
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      message: 'Kendaraan berhasil diperbarui',
      data: this.toPlain(vehicle as unknown as Record<string, unknown>),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.vehicle.delete({ where: { id } });

    return {
      message: 'Kendaraan berhasil dihapus',
      data: null,
    };
  }
}