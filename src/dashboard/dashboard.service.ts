import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    // ── Totals ───────────────────────────────────────────────────────────────
    const [userCount, vehicleCount, rentalCount, revenueAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vehicle.count(),
      this.prisma.rental.count(),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
    ]);

    const totals = {
      users: userCount,
      vehicles: vehicleCount,
      rentals: rentalCount,
      revenue: Number(revenueAgg._sum.amount ?? 0),
    };

    // ── Vehicles per status ───────────────────────────────────────────────────
    const vehicleGroups = await this.prisma.vehicle.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const vehicleMap: Record<string, number> = {
      available: 0,
      rented: 0,
      maintenance: 0,
    };
    for (const g of vehicleGroups) {
      vehicleMap[g.status.toLowerCase()] = g._count._all;
    }

    const vehicles = {
      available: vehicleMap['available'],
      rented: vehicleMap['rented'],
      maintenance: vehicleMap['maintenance'],
    };

    // ── Rentals per status ────────────────────────────────────────────────────
    const rentalGroups = await this.prisma.rental.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const rentalMap: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const g of rentalGroups) {
      rentalMap[g.status.toLowerCase()] = g._count._all;
    }

    const rentals = {
      pending: rentalMap['pending'],
      confirmed: rentalMap['confirmed'],
      ongoing: rentalMap['ongoing'],
      completed: rentalMap['completed'],
      cancelled: rentalMap['cancelled'],
    };

    // ── Recent rentals (maks 5) ───────────────────────────────────────────────
    const recent = await this.prisma.rental.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        vehicle: { select: { name: true } },
      },
    });

    const recentRentals = recent.map((r) => ({
      id: r.id,
      userName: r.user.name,
      vehicleName: r.vehicle.name,
      totalPrice: Number(r.totalPrice),
      status: r.status,
      createdAt: r.createdAt,
    }));

    return {
      message: 'Statistik dashboard',
      data: { totals, vehicles, rentals, recentRentals },
    };
  }
}