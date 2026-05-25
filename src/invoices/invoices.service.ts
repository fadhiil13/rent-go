import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

// ── helper ────────────────────────────────────────────────────────────────────
function toPlain(invoice: Record<string, any>): Record<string, any> {
  const i = { ...invoice };
  if (i.amount != null) i.amount = Number(i.amount);

  if (i.rental) {
    const r = { ...i.rental };
    if (r.totalPrice != null) r.totalPrice = Number(r.totalPrice);

    if (r.vehicle) {
      const v = { ...r.vehicle };
      if (v.pricePerDay != null) v.pricePerDay = Number(v.pricePerDay);
      r.vehicle = v;
    }

    if (r.user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeUser } = r.user;
      r.user = safeUser;
    }

    i.rental = r;
  }

  return i;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── dipanggil internal dari PaymentsService setelah pay() sukses ─────────
  async generateForRental(rentalId: string) {
    // 1. Pastikan rental ada
    const rental = await this.prisma.rental.findUnique({
      where: { id: rentalId },
    });
    if (!rental) throw new NotFoundException('Rental tidak ditemukan');

    // 2. Pastikan sudah ada payment PAID
    const paidPayment = await this.prisma.payment.findFirst({
      where: { rentalId, status: 'PAID' },
    });
    if (!paidPayment) {
      throw new BadRequestException('Belum ada pembayaran lunas');
    }

    // 3. Idempotent — kembalikan yang sudah ada
    const existing = await this.prisma.invoice.findUnique({
      where: { rentalId },
    });
    if (existing) return toPlain(existing);

    // 4. Generate invoiceNumber: INV-{tahun}-{urut6digit}
    const year = new Date().getFullYear();
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Hitung jumlah invoice di tahun berjalan (dalam transaksi agar aman)
      const count = await tx.invoice.count({
        where: {
          issuedAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
      });

      const invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;

      return tx.invoice.create({
        data: {
          rentalId,
          invoiceNumber,
          amount: rental.totalPrice,
          issuedAt: new Date(),
        },
      });
    });

    return toPlain(invoice);
  }

  // ── GET /invoices/rental/:rentalId ────────────────────────────────────────
  async findOneByRental(currentUser: JwtPayload, rentalId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { rentalId },
      include: {
        rental: {
          include: { vehicle: true, user: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice belum ada');

    if (
      (currentUser.role as Role) === Role.USER &&
      invoice.rental.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Anda tidak memiliki akses ke invoice ini');
    }

    return { message: 'Detail invoice', data: toPlain(invoice) };
  }

  // ── GET /invoices (admin) ─────────────────────────────────────────────────
  async findAllAdmin() {
    const invoices = await this.prisma.invoice.findMany({
      include: {
        rental: {
          include: { vehicle: true, user: true },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return {
      message: 'Daftar invoice',
      data: invoices.map(toPlain),
    };
  }
}