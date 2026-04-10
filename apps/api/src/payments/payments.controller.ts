import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('page') page = '1', @Query('limit') limit = '50') {
    const p = parseInt(page);
    const l = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          billing: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, studentCode: true, programType: true },
              },
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.payment.count(),
    ]);
    return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  @Get('stats')
  async getStats() {
    const [totalPayments, byMethod] = await Promise.all([
      this.prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
      this.prisma.payment.groupBy({ by: ['paymentMethod'], _sum: { amount: true }, _count: true }),
    ]);
    return {
      totalAmount: totalPayments._sum.amount || 0,
      totalCount: totalPayments._count,
      byMethod: byMethod.reduce((acc, m) => {
        acc[m.paymentMethod] = { count: m._count, amount: m._sum.amount || 0 };
        return acc;
      }, {} as Record<string, any>),
    };
  }
}
