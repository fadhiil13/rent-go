import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleStatus, Role, Prisma } from '@prisma/client';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalStatusDto } from './dto/update-rental-status.dto';
import { QueryRentalDto } from './dto/query-rental.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private convertDecimal(rental: Record<string, unknown>): Record<string, unknown> {
    const result = { ...rental };

    if (result.totalPrice !== undefined) {
      result.totalPrice = Number(result.totalPrice);
    }

    if (result.vehicle && typeof result.vehicle === 'object') {
      const vehicle = { ...(result.vehicle as Record<string, unknown>) };
      if (vehicle.pricePerDay !== undefined) {
        vehicle.pricePerDay = Number(vehicle.pricePerDay);
      }
      result.vehicle = vehicle;
    }

    return result;
  }

  private excludePassword(rental: Record<string, unknown>): Record<string, unknown> {
    const result = { ...rental };
    if (result.user && typeof result.user === 'object') {
      const { password: _pw, ...safeUser } = result.user as Record<string, unknown>;
      result.user = safeUser;
    }
    return result;
  }

  private toPlain(rental: unknown): Record<string, unknown> {
    let result = rental as Record<string, unknown>;
    result = this.convertDecimal(result);
    result = this.excludePassword(result);
    return result;
  }

  // ── create ───────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateRentalDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('Tanggal selesai harus setelah tanggal mulai');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestException('Kendaraan tidak tersedia');
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const jumlahHari = Math.max(1, Math.ceil(diffMs / 86400000));
    const pricePerDay = Number(vehicle.pricePerDay);
    const totalPrice = pricePerDay * jumlahHari;

    const rental = await this.prisma.rental.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        startDate,
        endDate,
        totalPrice,
        status: 'PENDING',
      },
      include: {
        vehicle: true,
        user: true,
      },
    });

    return {
      message: 'Rental berhasil dibuat',
      data: this.toPlain(rental as unknown as Record<string, unknown>),
    };
  }

  // ── findAll ──────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload, query: QueryRentalDto) {
    const where: Prisma.RentalWhereInput = {};

    if (currentUser.role === Role.USER) {
      where.userId = currentUser.sub;
    }

    if (query.status) {
      where.status = query.status;
    }

    const rentals = await this.prisma.rental.findMany({
      where,
      include: {
        vehicle: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Daftar rental',
      data: rentals.map((r) =>
        this.toPlain(r as unknown as Record<string, unknown>),
      ),
    };
  }

  // ── findOne ──────────────────────────────────────────────────────────────

  async findOne(currentUser: JwtPayload, id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true,
      },
    });

    if (!rental) {
      throw new NotFoundException('Rental tidak ditemukan');
    }

    if (
      currentUser.role === Role.USER &&
      rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke rental ini');
    }

    return {
      message: 'Detail rental',
      data: this.toPlain(rental as unknown as Record<string, unknown>),
    };
  }

  // ── updateStatus ─────────────────────────────────────────────────────────

  async updateStatus(id: string, dto: UpdateRentalStatusDto) {
    const rental = await this.prisma.rental.findUnique({ where: { id } });
    if (!rental) {
      throw new NotFoundException('Rental tidak ditemukan');
    }

    const updated = await this.prisma.rental.update({
      where: { id },
      data: { status: dto.status },
      include: {
        vehicle: true,
        user: true,
      },
    });

    return {
      message: 'Status rental berhasil diperbarui',
      data: this.toPlain(updated as unknown as Record<string, unknown>),
    };
  }

  // ── complete ──────────────────────────────────────────────────────────────

  async complete(id: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: { vehicle: true, user: true },
    });
    if (!rental) throw new NotFoundException('Rental tidak ditemukan');

    // Validasi transisi status
    if (rental.status === 'COMPLETED') {
      throw new BadRequestException('Rental sudah selesai');
    }
    if (rental.status === 'CANCELLED') {
      throw new BadRequestException('Rental sudah dibatalkan');
    }
    if (rental.status === 'PENDING') {
      throw new BadRequestException('Rental belum dikonfirmasi/dibayar');
    }
    // Di sini status pasti CONFIRMED atau ONGOING

    // Cek payment PAID (aktif — wajib lunas sebelum complete)
    const paidPayment = await this.prisma.payment.findFirst({
      where: { rentalId: id, status: 'PAID' },
    });
    if (!paidPayment) {
      throw new BadRequestException('Pembayaran belum lunas');
    }

    // Transaksi: selesaikan rental + kembalikan kendaraan ke AVAILABLE
    await this.prisma.$transaction([
      this.prisma.rental.update({
        where: { id },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.vehicle.update({
        where: { id: rental.vehicleId },
        data: { status: 'AVAILABLE' },
      }),
    ]);

    // Ambil data terbaru untuk response
    const updated = await this.prisma.rental.findUnique({
      where: { id },
      include: { vehicle: true, user: true },
    });

    return {
      message: 'Rental diselesaikan',
      data: this.toPlain(updated as unknown as Record<string, unknown>),
    };
  }
}