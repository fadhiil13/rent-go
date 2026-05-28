import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentMethod, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { PaymentInfoService } from './payment-info.service';

// ── helper ────────────────────────────────────────────────────────────────────
function toPlain(payment: Record<string, any>): Record<string, any> {
  const p = { ...payment };
  if (p.amount != null) p.amount = Number(p.amount);

  if (p.rental) {
    const r = { ...p.rental };
    if (r.totalPrice != null) r.totalPrice = Number(r.totalPrice);
    if (r.vehicle) {
      const v = { ...r.vehicle };
      if (v.pricePerDay != null) v.pricePerDay = Number(v.pricePerDay);
      r.vehicle = v;
    }
    if (r.user) {
      const { password, ...safeUser } = r.user;
      r.user = safeUser;
    }
    p.rental = r;
  }

  return p;
}

function generateReference(): string {
  return 'PAY-' + randomBytes(4).toString('hex').toUpperCase();
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly paymentInfoService: PaymentInfoService,
    @Inject(forwardRef(() => InvoicesService))
    private readonly invoicesService: InvoicesService,
  ) {}

  // ── POST /payments ────────────────────────────────────────────────────────

  async create(currentUser: JwtPayload, dto: CreatePaymentDto) {
    const rental = await this.prisma.rental.findUnique({
      where: { id: dto.rentalId },
      include: { vehicle: true, user: true },
    });
    if (!rental) throw new NotFoundException('Rental tidak ditemukan');

    if (
      (currentUser.role as Role) === Role.USER &&
      rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke rental ini');
    }

    if (rental.status === 'CANCELLED') {
      throw new BadRequestException('Rental sudah dibatalkan');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { rentalId: dto.rentalId },
    });
    if (existing) throw new ConflictException('Pembayaran sudah dibuat');

    const method = dto.method ?? PaymentMethod.TRANSFER;

    const payment = await this.prisma.payment.create({
      data: {
        rentalId: dto.rentalId,
        amount: rental.totalPrice,
        method,
        status: PaymentStatus.PENDING,
        reference: generateReference(),
        paidAt: null,
      },
    });

    // Sertakan info pembayaran sesuai method yang dipilih
    const paymentInfo = this.paymentInfoService.getPaymentInfo(method);

    return {
      message: 'Pembayaran dibuat',
      data: {
        ...toPlain(payment),
        paymentInfo,
      },
    };
  }

  // ── GET /payments/info/:method ────────────────────────────────────────────

  async getPaymentInfo(method: PaymentMethod) {
    const info = this.paymentInfoService.getPaymentInfo(method);
    return { message: 'Info pembayaran', data: info };
  }

  // ── POST /payments/:id/proof ──────────────────────────────────────────────

  async uploadProof(
    currentUser: JwtPayload,
    paymentId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File tidak ada');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { rental: true },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    if (
      (currentUser.role as Role) === Role.USER &&
      payment.rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke pembayaran ini');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Pembayaran sudah lunas');
    }

    const { url } = await this.cloudinaryService.uploadImage(file);

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofUrl: url,
        proofStatus: 'PENDING_REVIEW',
      },
    });

    return {
      message: 'Bukti pembayaran berhasil diupload, menunggu konfirmasi admin',
      data: toPlain(updated),
    };
  }

  // ── POST /payments/:id/confirm (ADMIN) ────────────────────────────────────

  async confirmProof(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { rental: true },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    if (!payment.proofUrl) {
      throw new BadRequestException('Belum ada bukti pembayaran yang diupload');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Pembayaran sudah lunas');
    }

    const newRentalStatus =
      payment.rental.status === 'PENDING' ? 'CONFIRMED' : payment.rental.status;

    const ops: Prisma.PrismaPromise<any>[] = [
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          proofStatus: 'APPROVED',
          paidAt: new Date(),
        },
      }),
      this.prisma.rental.update({
        where: { id: payment.rentalId },
        data: { status: newRentalStatus },
      }),
    ];

    if (payment.rental.vehicleId) {
      ops.push(
        this.prisma.vehicle.updateMany({
          where: { id: payment.rental.vehicleId, status: 'AVAILABLE' },
          data: { status: 'RENTED' },
        }),
      );
    }

    const [updatedPayment] = await this.prisma.$transaction(ops);

    await this.invoicesService.generateForRental(payment.rentalId);

    return {
      message: 'Pembayaran dikonfirmasi, invoice auto-generate',
      data: toPlain(updatedPayment),
    };
  }

  // ── POST /payments/:id/reject (ADMIN) ─────────────────────────────────────

  async rejectProof(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    if (!payment.proofUrl) {
      throw new BadRequestException('Belum ada bukti pembayaran');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Pembayaran sudah lunas, tidak bisa ditolak');
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        proofUrl: null,
        proofStatus: 'REJECTED',
      },
    });

    return {
      message: 'Bukti pembayaran ditolak, user perlu upload ulang',
      data: toPlain(updated),
    };
  }

  // ── POST /payments/:id/pay (mock) ─────────────────────────────────────────

  async pay(currentUser: JwtPayload, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { rental: true },
    });
    if (!payment) throw new NotFoundException('Pembayaran tidak ditemukan');

    if (
      (currentUser.role as Role) === Role.USER &&
      payment.rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke pembayaran ini');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Pembayaran sudah lunas');
    }

    const newRentalStatus =
      payment.rental.status === 'PENDING' ? 'CONFIRMED' : payment.rental.status;

    const ops: Prisma.PrismaPromise<any>[] = [
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      }),
      this.prisma.rental.update({
        where: { id: payment.rentalId },
        data: { status: newRentalStatus },
      }),
    ];

    if (payment.rental.vehicleId) {
      ops.push(
        this.prisma.vehicle.updateMany({
          where: { id: payment.rental.vehicleId, status: 'AVAILABLE' },
          data: { status: 'RENTED' },
        }),
      );
    }

    const [updatedPayment] = await this.prisma.$transaction(ops);
    await this.invoicesService.generateForRental(payment.rentalId);

    return {
      message: 'Pembayaran berhasil (mock)',
      data: toPlain(updatedPayment),
    };
  }

  // ── GET /payments/rental/:rentalId ────────────────────────────────────────

  async findOneByRental(currentUser: JwtPayload, rentalId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { rentalId },
      include: { rental: { include: { vehicle: true, user: true } } },
    });
    if (!payment) throw new NotFoundException('Pembayaran belum ada');

    if (
      (currentUser.role as Role) === Role.USER &&
      payment.rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke pembayaran ini');
    }

    return { message: 'Detail pembayaran', data: toPlain(payment) };
  }

  // ── GET /payments (admin) ─────────────────────────────────────────────────

  async findAllAdmin(query: QueryPaymentDto = {}) {
    const { status, page = 1, limit = 10 } = query;

    const where: Prisma.PaymentWhereInput = {
      ...(status !== undefined && { status }),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { rental: { include: { vehicle: true, user: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      message: 'Daftar pembayaran',
      data: {
        items: items.map(toPlain),
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    };
  }
}