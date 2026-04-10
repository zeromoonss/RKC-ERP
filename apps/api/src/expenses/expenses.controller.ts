import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('status') status?: string,
  ) {
    const p = parseInt(page);
    const l = parseInt(limit);
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          approvals: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  @Post()
  async create(
    @Body() dto: { title: string; category: string; description?: string; amount: number },
    @CurrentUser('sub') userId: string,
  ) {
    return this.prisma.expense.create({
      data: {
        title: dto.title,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        requestedBy: userId,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    await this.prisma.expenseApproval.create({
      data: { expenseId: id, approvedBy: userId, action: 'approved' },
    });
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    await this.prisma.expenseApproval.create({
      data: { expenseId: id, approvedBy: userId, action: 'rejected' },
    });
    return this.prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
  }

  @Get('stats')
  async getStats() {
    const [byStatus, totalApproved] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
      }),
    ]);
    return {
      totalApproved: totalApproved._sum.amount || 0,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = { count: item._count, amount: item._sum.amount || 0 };
        return acc;
      }, {} as Record<string, any>),
    };
  }
}
