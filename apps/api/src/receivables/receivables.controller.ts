import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('receivables')
@UseGuards(JwtAuthGuard)
export class ReceivablesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('page') page = '1', @Query('limit') limit = '50', @Query('resolved') resolved?: string) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const where: any = {};
    if (resolved === 'true') {
      where.resolvedAt = { not: null };
    } else if (resolved === 'false') {
      where.resolvedAt = null;
    }

    const [data, total] = await Promise.all([
      this.prisma.receivable.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, studentCode: true, programType: true },
          },
          billing: {
            select: { id: true, billingMonth: true, totalAmount: true, paidAmount: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.receivable.count({ where }),
    ]);
    return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  @Get('stats')
  async getStats() {
    const [outstanding, resolved] = await Promise.all([
      this.prisma.receivable.aggregate({
        where: { resolvedAt: null },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.receivable.aggregate({
        where: { resolvedAt: { not: null } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    return {
      outstanding: { amount: outstanding._sum.amount || 0, count: outstanding._count },
      resolved: { amount: resolved._sum.amount || 0, count: resolved._count },
    };
  }
}
