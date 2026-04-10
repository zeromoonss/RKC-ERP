import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getDashboard() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('royalty')
  @UseGuards(JwtAuthGuard)
  async getRoyalty(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dashboardService.getRoyaltyData(y);
  }
}
