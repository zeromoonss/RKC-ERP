import { Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('page') page = '1', @Query('limit') limit = '50') {
    const p = parseInt(page);
    const l = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        include: {
          billing: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, studentCode: true, programType: true },
              },
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.invoice.count(),
    ]);
    return { data, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) } };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        billing: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, studentCode: true, programType: true },
            },
            items: true,
            payments: { orderBy: { paymentDate: 'desc' } },
          },
        },
      },
    });
  }

  @Get(':id/html')
  async getInvoiceHtml(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        billing: {
          include: {
            student: true,
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const b = invoice.billing;
    const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

    const itemRows = b.items.map(item =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.itemName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatVND(item.originalAmount)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${formatVND(item.discountAmount)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatVND(item.finalAmount)}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f8f9fa; padding: 40px; }
    .invoice { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 32px 40px; }
    .header h1 { font-size: 28px; font-weight: 700; }
    .header p { font-size: 14px; opacity: 0.8; margin-top: 4px; }
    .body { padding: 32px 40px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .meta-block p { font-size: 13px; color: #666; line-height: 1.6; }
    .meta-block strong { color: #111; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 13px; color: #475569; font-weight: 600; }
    th:nth-child(n+2) { text-align: right; }
    .total-row td { border-top: 2px solid #4f46e5; font-weight: 700; font-size: 15px; padding: 12px; }
    .footer { text-align: center; padding: 24px 40px; background: #f8f9fa; color: #94a3b8; font-size: 12px; }
    @media print { body { background: #fff; padding: 0; } .invoice { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>INVOICE</h1>
      <p>Royal Kids College</p>
    </div>
    <div class="body">
      <div class="meta">
        <div class="meta-block">
          <p><strong>인보이스 번호:</strong> ${invoice.invoiceNo}</p>
          <p><strong>발행일:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
          <p><strong>납부 기한:</strong> ${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '—'}</p>
        </div>
        <div class="meta-block" style="text-align:right;">
          <p><strong>원생:</strong> ${b.student.lastName} ${b.student.firstName}</p>
          <p><strong>학번:</strong> ${b.student.studentCode}</p>
          <p><strong>청구월:</strong> ${new Date(b.billingMonth).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>원금</th>
            <th>할인</th>
            <th>청구액</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" style="text-align:right;">합계</td>
            <td style="text-align:right;color:#4f46e5;">${formatVND(b.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      ${b.paidAmount > 0 ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:16px;">
        <p style="font-size:13px;color:#15803d;"><strong>납부 완료:</strong> ${formatVND(b.paidAmount)}</p>
        ${b.totalAmount - b.paidAmount > 0 ? `<p style="font-size:13px;color:#b45309;"><strong>잔액:</strong> ${formatVND(b.totalAmount - b.paidAmount)}</p>` : ''}
      </div>` : ''}
    </div>
    <div class="footer">
      <p>Royal Kids College · 베트남 호치민시</p>
      <p>본 인보이스는 전자적으로 생성되었으며 서명이 필요하지 않습니다.</p>
    </div>
  </div>
</body>
</html>`;

    // Mark as downloaded
    await this.prisma.invoice.update({
      where: { id },
      data: { downloadedAt: new Date(), status: 'DOWNLOADED' },
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Patch(':id/void')
  async voidInvoice(@Param('id') id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOIDED', voidedAt: new Date() },
    });
  }
}
