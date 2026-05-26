import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';

// ── helper ────────────────────────────────────────────────────────────────────
function toPlain(review: Record<string, any>): Record<string, any> {
  const r = { ...review };

  if (r.rental) {
    const rental = { ...r.rental };
    if (rental.totalPrice != null) rental.totalPrice = Number(rental.totalPrice);
    if (rental.user) {
      const { password, ...safeUser } = rental.user;
      rental.user = safeUser;
    }
    r.rental = rental;
  }

  if (r.user) {
    const { password, ...safeUser } = r.user;
    r.user = safeUser;
  }

  if (r.vehicle) {
    const v = { ...r.vehicle };
    if (v.pricePerDay != null) v.pricePerDay = Number(v.pricePerDay);
    r.vehicle = v;
  }

  return r;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── POST /reviews ─────────────────────────────────────────────────────────

  async create(currentUser: JwtPayload, dto: CreateReviewDto) {
    // 1. Cek rental ada
    const rental = await this.prisma.rental.findUnique({
      where: { id: dto.rentalId },
    });
    if (!rental) throw new NotFoundException('Rental tidak ditemukan');

    // 2. Hanya pemilik rental yang bisa review
    if (rental.userId !== currentUser.sub) {
      throw new ForbiddenException('Anda tidak memiliki akses ke rental ini');
    }

    // 3. Rental harus COMPLETED
    if (rental.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Hanya rental yang sudah selesai yang bisa direview',
      );
    }

    // 4. Cek sudah pernah review
    const existing = await this.prisma.review.findUnique({
      where: { rentalId: dto.rentalId },
    });
    if (existing) {
      throw new BadRequestException('Rental ini sudah pernah direview');
    }

    const review = await this.prisma.review.create({
      data: {
        rentalId: dto.rentalId,
        userId: currentUser.sub,
        vehicleId: rental.vehicleId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: true,
        vehicle: true,
        rental: true,
      },
    });

    return { message: 'Review berhasil ditambahkan', data: toPlain(review) };
  }

  // ── GET /reviews/vehicle/:vehicleId ───────────────────────────────────────

  async findByVehicle(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Kendaraan tidak ditemukan');

    const reviews = await this.prisma.review.findMany({
      where: { vehicleId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Hitung rata-rata rating
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return {
      message: 'Daftar review kendaraan',
      data: {
        vehicleId,
        avgRating: Math.round(avgRating * 10) / 10, // 1 desimal
        totalReviews: reviews.length,
        reviews: reviews.map(toPlain),
      },
    };
  }

  // ── GET /reviews/my ───────────────────────────────────────────────────────

  async findMyReviews(currentUser: JwtPayload) {
    const reviews = await this.prisma.review.findMany({
      where: { userId: currentUser.sub },
      include: { vehicle: true, rental: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Review saya',
      data: reviews.map(toPlain),
    };
  }

  // ── DELETE /reviews/:id ───────────────────────────────────────────────────

  async remove(currentUser: JwtPayload, id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');

    // USER hanya bisa hapus miliknya, ADMIN bisa hapus semua
    if (
      (currentUser.role as Role) === Role.USER &&
      review.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke review ini');
    }

    await this.prisma.review.delete({ where: { id } });

    return { message: 'Review berhasil dihapus', data: null };
  }

  // ── GET /reviews (admin) ──────────────────────────────────────────────────

  async findAllAdmin() {
    const reviews = await this.prisma.review.findMany({
      include: { user: true, vehicle: true, rental: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Daftar semua review',
      data: reviews.map(toPlain),
    };
  }
}