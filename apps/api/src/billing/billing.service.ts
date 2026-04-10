import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBillingDto, QueryBillingDto, RegisterPaymentDto } from './dto/billing.dto';
import { AuditAction, BillingStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBillingDto, userId: string) {
    // Validate student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (student.status === 'WITHDRAWN') {
      throw new BadRequestException('Cannot create billing for withdrawn student');
    }

    // Check duplicate billing for same month
    const billingMonth = new Date(dto.billingMonth);
    billingMonth.setDate(1); // Normalize to 1st of month

    const existing = await this.prisma.billing.findUnique({
      where: {
        studentId_billingMonth: {
          studentId: dto.studentId,
          billingMonth,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Billing already exists for ${student.firstName} ${student.lastName} for this month`,
      );
    }

    // Calculate totals
    const items = dto.items.map((item) => ({
      itemName: item.itemName,
      originalAmount: item.originalAmount,
      discountAmount: item.discountAmount ?? 0,
      finalAmount: item.originalAmount - (item.discountAmount ?? 0),
      promotionId: item.promotionId,
      promotionName: item.promotionName,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.originalAmount, 0);
    const discountTotal = items.reduce((sum, i) => sum + i.discountAmount, 0);
    const totalAmount = subtotal - discountTotal;

    const billing = await this.prisma.billing.create({
      data: {
        studentId: dto.studentId,
        billingMonth,
        subtotal,
        discountTotal,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note,
        status: 'DRAFT',
        items: {
          create: items,
        },
      },
      include: {
        items: true,
        student: { select: { id: true, firstName: true, lastName: true, studentCode: true } },
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'billing',
      entityId: billing.id,
      details: { studentId: dto.studentId, billingMonth: dto.billingMonth, totalAmount },
    });

    return billing;
  }

  async findAll(query: QueryBillingDto) {
    const { billingMonth, status, studentId, programType, page = 1, limit = 50 } = query;

    const where: any = {};

    if (billingMonth) {
      const date = new Date(`${billingMonth}-01`);
      where.billingMonth = date;
    }

    if (status) {
      where.status = status;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (programType) {
      where.student = { programType };
    }

    const [data, total] = await Promise.all([
      this.prisma.billing.findMany({
        where,
        include: {
          student: {
            select: {
              id: true, firstName: true, lastName: true,
              studentCode: true, programType: true,
            },
          },
          items: true,
          payments: { orderBy: { paymentDate: 'desc' } },
          _count: { select: { payments: true } },
        },
        orderBy: [{ billingMonth: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billing.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const billing = await this.prisma.billing.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            studentCode: true, programType: true, status: true,
          },
        },
        items: true,
        invoice: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        receivable: true,
      },
    });

    if (!billing) throw new NotFoundException('Billing not found');
    return billing;
  }

  /**
   * 청구서를 "발행(ISSUED)" 상태로 전환.
   * DRAFT → ISSUED. 납부 기한 설정. Invoice 자동 생성.
   */
  async issue(id: string, dueDate: string | undefined, userId: string) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) throw new NotFoundException('Billing not found');
    if (billing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT billings can be issued');
    }

    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30일 후

    // Generate invoice number: INV-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceCount = await this.prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const invoiceNo = `INV-${dateStr}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.billing.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
          dueDate: due,
        },
      });

      // 미수금(Receivable) 자동 생성
      await tx.receivable.create({
        data: {
          billingId: id,
          studentId: billing.studentId,
          amount: billing.totalAmount - billing.paidAmount,
          dueDate: due,
        },
      });

      // 인보이스(Invoice) 자동 생성
      await tx.invoice.create({
        data: {
          billingId: id,
          invoiceNo,
          status: 'GENERATED',
          issuedAt: new Date(),
        },
      });

      return updated;
    });

    await this.auditService.log({
      userId,
      action: AuditAction.STATUS_CHANGE,
      entity: 'billing',
      entityId: id,
      details: { from: 'DRAFT', to: 'ISSUED', dueDate: due, invoiceNo },
    });

    return this.findOne(id);
  }

  /**
   * 수납(Payment) 등록.
   * 납부 금액에 따라 PARTIALLY_PAID 또는 PAID로 자동 전환.
   */
  async registerPayment(billingId: string, dto: RegisterPaymentDto, userId: string) {
    const billing = await this.prisma.billing.findUnique({ where: { id: billingId } });
    if (!billing) throw new NotFoundException('Billing not found');

    if (['DRAFT', 'CANCELLED'].includes(billing.status)) {
      throw new BadRequestException('Cannot register payment for this billing status');
    }

    const newPaidAmount = billing.paidAmount + dto.amount;
    const remaining = billing.totalAmount - newPaidAmount;

    let newStatus: BillingStatus = billing.status;
    if (remaining <= 0) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await this.prisma.$transaction(async (tx) => {
      // Record payment
      await tx.payment.create({
        data: {
          billingId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as PaymentMethod,
          paymentDate: new Date(dto.paymentDate),
          reference: dto.reference,
          note: dto.note,
          collectedBy: userId,
        },
      });

      // Update billing
      await tx.billing.update({
        where: { id: billingId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      // Update receivable
      if (remaining <= 0) {
        await tx.receivable.updateMany({
          where: { billingId, resolvedAt: null },
          data: { amount: 0, resolvedAt: new Date() },
        });
      } else {
        await tx.receivable.updateMany({
          where: { billingId },
          data: { amount: remaining },
        });
      }
    });

    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      entity: 'payment',
      entityId: billingId,
      details: { amount: dto.amount, method: dto.paymentMethod, newStatus },
    });

    return this.findOne(billingId);
  }

  /**
   * 청구서 취소.
   * 관련 미수금도 해소 처리.
   */
  async cancel(id: string, reason: string, userId: string) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) throw new NotFoundException('Billing not found');
    if (billing.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a fully paid billing');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.billing.update({
        where: { id },
        data: { status: 'CANCELLED', note: `Cancelled: ${reason}` },
      });

      await tx.receivable.updateMany({
        where: { billingId: id, resolvedAt: null },
        data: { amount: 0, resolvedAt: new Date() },
      });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.STATUS_CHANGE,
      entity: 'billing',
      entityId: id,
      details: { from: billing.status, to: 'CANCELLED', reason },
    });

    return this.findOne(id);
  }

  // ─── UPDATE (오너 전용) ───
  async update(
    id: string,
    body: { items?: Array<{ itemName: string; originalAmount: number; discountAmount?: number }>; note?: string },
    userId: string,
  ) {
    const billing = await this.prisma.billing.findUnique({ where: { id } });
    if (!billing) throw new NotFoundException('Billing not found');

    if (billing.status !== 'DRAFT') {
      throw new BadRequestException('발행된 청구서는 수정할 수 없습니다. 먼저 취소 후 재생성해주세요.');
    }

    if (body.items && body.items.length > 0) {
      const items = body.items.map(i => ({
        itemName: i.itemName,
        originalAmount: i.originalAmount,
        discountAmount: i.discountAmount ?? 0,
        finalAmount: i.originalAmount - (i.discountAmount ?? 0),
      }));

      const subtotal = items.reduce((s, i) => s + i.originalAmount, 0);
      const discountTotal = items.reduce((s, i) => s + i.discountAmount, 0);
      const totalAmount = subtotal - discountTotal;

      await this.prisma.$transaction(async (tx) => {
        await tx.billingItem.deleteMany({ where: { billingId: id } });
        await tx.billingItem.createMany({
          data: items.map(i => ({ billingId: id, ...i })),
        });
        await tx.billing.update({
          where: { id },
          data: { subtotal, discountTotal, totalAmount, note: body.note ?? billing.note },
        });
      });
    } else if (body.note !== undefined) {
      await this.prisma.billing.update({
        where: { id },
        data: { note: body.note },
      });
    }

    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      entity: 'billing',
      entityId: id,
      details: { changes: body },
    });

    return this.findOne(id);
  }

  // ─── DELETE (오너 전용) ───
  async delete(id: string, userId: string) {
    const billing = await this.prisma.billing.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });
    if (!billing) throw new NotFoundException('Billing not found');

    if (billing._count.payments > 0) {
      throw new BadRequestException(
        '결제 이력이 있는 청구서는 삭제할 수 없습니다. 취소 처리를 사용해주세요.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.billingItem.deleteMany({ where: { billingId: id } });
      await tx.receivable.deleteMany({ where: { billingId: id } });
      await tx.invoice.deleteMany({ where: { billingId: id } });
      await tx.billing.delete({ where: { id } });
    });

    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      entity: 'billing',
      entityId: id,
      details: { studentId: billing.studentId, totalAmount: billing.totalAmount },
    });

    return { message: 'Billing deleted successfully' };
  }

  /**
   * 월별 청구 통계 요약.
   */
  async getMonthSummary(billingMonth: string) {
    const date = new Date(`${billingMonth}-01`);

    const [billings, totalBilled, totalPaid, totalDiscount] = await Promise.all([
      this.prisma.billing.groupBy({
        by: ['status'],
        where: { billingMonth: date },
        _count: true,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.billing.aggregate({
        where: { billingMonth: date },
        _sum: { totalAmount: true },
      }),
      this.prisma.billing.aggregate({
        where: { billingMonth: date },
        _sum: { paidAmount: true },
      }),
      this.prisma.billing.aggregate({
        where: { billingMonth: date },
        _sum: { discountTotal: true },
      }),
    ]);

    const billed = totalBilled._sum.totalAmount || 0;
    const paid = totalPaid._sum.paidAmount || 0;

    return {
      billingMonth,
      totalBilled: billed,
      totalPaid: paid,
      totalDiscount: totalDiscount._sum.discountTotal || 0,
      outstanding: billed - paid,
      collectionRate: billed > 0 ? Math.round((paid / billed) * 100) : 0,
      byStatus: billings.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count,
          totalAmount: item._sum.totalAmount || 0,
          paidAmount: item._sum.paidAmount || 0,
        };
        return acc;
      }, {} as Record<string, any>),
    };
  }
}

