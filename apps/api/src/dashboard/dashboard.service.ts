import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Student counts
    const [totalStudents, kindergartenStudents, academyStudents] =
      await Promise.all([
        this.prisma.student.count({
          where: { status: { not: 'WITHDRAWN' } },
        }),
        this.prisma.student.count({
          where: {
            programType: { in: ['KINDERGARTEN', 'BOTH'] },
            status: { not: 'WITHDRAWN' },
          },
        }),
        this.prisma.student.count({
          where: {
            programType: { in: ['ACADEMY', 'BOTH'] },
            status: { not: 'WITHDRAWN' },
          },
        }),
      ]);

    // Billing stats for current month
    const billings = await this.prisma.billing.findMany({
      where: { billingMonth: currentMonth },
      select: {
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    const totalBilled = billings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPaid = billings.reduce((sum, b) => sum + b.paidAmount, 0);
    const collectionRate =
      totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    // Receivables (outstanding)
    const receivables = await this.prisma.receivable.aggregate({
      where: { resolvedAt: null },
      _sum: { amount: true },
      _count: true,
    });

    // Expenses for current month
    const expenses = await this.prisma.expense.aggregate({
      where: {
        status: { in: ['APPROVED', 'PAID'] },
        createdAt: { gte: currentMonth },
      },
      _sum: { amount: true },
    });

    // Recent billings (last 5)
    const recentBillings = await this.prisma.billing.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        billingMonth: true,
        createdAt: true,
        student: {
          select: { firstName: true, lastName: true, studentCode: true },
        },
      },
    });

    // Class summary
    const classes = await this.prisma.class.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        classType: true,
        capacity: true,
        _count: { select: { students: { where: { isActive: true } } } },
        teachers: {
          where: { isActive: true },
          select: { user: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Recent payments (last 5)
    const recentPayments = await this.prisma.payment.findMany({
      take: 5,
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        billing: {
          select: {
            student: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      students: {
        total: totalStudents,
        kindergarten: kindergartenStudents,
        academy: academyStudents,
      },
      billing: {
        totalBilled,
        totalPaid,
        collectionRate,
        byStatus: billings.reduce((acc, b) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      receivables: {
        totalAmount: receivables._sum.amount || 0,
        count: receivables._count,
      },
      expenses: {
        totalAmount: expenses._sum.amount || 0,
      },
      recentBillings: recentBillings.map(b => ({
        id: b.id,
        studentName: `${b.student.lastName} ${b.student.firstName}`,
        studentCode: b.student.studentCode,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        status: b.status,
        createdAt: b.createdAt,
      })),
      classSummary: classes.map(c => ({
        id: c.id,
        name: c.name,
        classType: c.classType,
        capacity: c.capacity,
        studentCount: c._count.students,
        teachers: c.teachers.map(t => t.user.name),
      })),
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        studentName: `${p.billing.student.lastName} ${p.billing.student.firstName}`,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
      })),
    };
  }

  /**
   * Get royalty data — monthly revenue breakdown from billing records.
   * Only KINDERGARTEN tuition is royalty-eligible.
   */
  async getRoyaltyData(year: number) {
    // Get all PAID/ISSUED billings for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const billings = await this.prisma.billing.findMany({
      where: {
        billingMonth: { gte: startDate, lt: endDate },
        status: { in: ['ISSUED', 'PAID', 'PARTIALLY_PAID'] },
      },
      include: {
        items: true,
        student: {
          select: { programType: true },
        },
      },
    });

    // Group by month
    const monthlyMap = new Map<string, {
      tuitionRevenue: number;
      shuttleRevenue: number;
      textbookRevenue: number;
      snackRevenue: number;
      otherRevenue: number;
      studentIds: Set<string>;
    }>();

    for (const billing of billings) {
      const monthKey = billing.billingMonth.toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          tuitionRevenue: 0,
          shuttleRevenue: 0,
          textbookRevenue: 0,
          snackRevenue: 0,
          otherRevenue: 0,
          studentIds: new Set(),
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.studentIds.add(billing.studentId);

      for (const item of billing.items) {
        const name = item.itemName.toLowerCase();
        if (name.includes('tuition') || name.includes('등록금') || name.includes('원비')) {
          monthData.tuitionRevenue += item.finalAmount;
        } else if (name.includes('shuttle') || name.includes('셔틀')) {
          monthData.shuttleRevenue += item.finalAmount;
        } else if (name.includes('textbook') || name.includes('교재')) {
          monthData.textbookRevenue += item.finalAmount;
        } else if (name.includes('snack') || name.includes('스낵') || name.includes('간식')) {
          monthData.snackRevenue += item.finalAmount;
        } else {
          monthData.otherRevenue += item.finalAmount;
        }
      }
    }

    // If no billing data, return active student count and billing templates for estimation
    if (monthlyMap.size === 0) {
      const activeStudents = await this.prisma.student.count({
        where: { status: 'ACTIVE', programType: { in: ['KINDERGARTEN', 'BOTH'] } },
      });
      const templates = await this.prisma.billingTemplate.findMany({
        where: { isActive: true },
      });

      // Generate estimated months for the year
      const months = [];
      const now = new Date();
      const monthsToShow = year === now.getFullYear() ? now.getMonth() + 1 : 12;

      for (let m = 0; m < monthsToShow; m++) {
        const tuition = templates
          .filter(t => t.name.toLowerCase().includes('tuition') && t.programType !== 'ACADEMY')
          .reduce((s, t) => s + t.amount, 0) * activeStudents;
        const shuttle = templates
          .filter(t => t.name.toLowerCase().includes('shuttle'))
          .reduce((s, t) => s + t.amount, 0) * activeStudents;
        const textbook = templates
          .filter(t => t.name.toLowerCase().includes('textbook'))
          .reduce((s, t) => s + t.amount, 0) * activeStudents;
        const snack = templates
          .filter(t => t.name.toLowerCase().includes('snack'))
          .reduce((s, t) => s + t.amount, 0) * activeStudents;

        months.push({
          month: `${year}-${String(m + 1).padStart(2, '0')}`,
          tuitionRevenue: tuition,
          shuttleRevenue: shuttle,
          textbookRevenue: textbook,
          snackRevenue: snack,
          otherRevenue: 0,
          studentCount: activeStudents,
          isEstimate: true,
        });
      }
      return { months, isEstimate: true };
    }

    // Convert to array sorted by month
    const months = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // Newest first
      .map(([month, data]) => ({
        month,
        tuitionRevenue: data.tuitionRevenue,
        shuttleRevenue: data.shuttleRevenue,
        textbookRevenue: data.textbookRevenue,
        snackRevenue: data.snackRevenue,
        otherRevenue: data.otherRevenue,
        studentCount: data.studentIds.size,
        isEstimate: false,
      }));

    return { months, isEstimate: false };
  }
}
