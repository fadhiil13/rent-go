import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistik dashboard (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Statistik berhasil diambil',
    schema: {
      example: {
        success: true,
        message: 'Statistik dashboard',
        data: {
          totals: { users: 3, vehicles: 8, rentals: 3, revenue: 1050000 },
          vehicles: { available: 5, rented: 2, maintenance: 1 },
          rentals: { pending: 1, confirmed: 1, ongoing: 0, completed: 1, cancelled: 0 },
          recentRentals: [
            {
              id: 'uuid',
              userName: 'Budi Santoso',
              vehicleName: 'Toyota Avanza',
              totalPrice: 1050000,
              status: 'COMPLETED',
              createdAt: '2025-04-01T08:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden – bukan admin' })
  getStats() {
    return this.dashboardService.getStats();
  }
}