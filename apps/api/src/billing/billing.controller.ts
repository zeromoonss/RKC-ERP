import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateBillingDto, QueryBillingDto, IssueBillingDto, RegisterPaymentDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../shared';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.BILLING_CREATE)
  async create(
    @Body() dto: CreateBillingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.create(dto, userId);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  async findAll(@Query() query: QueryBillingDto) {
    return this.billingService.findAll(query);
  }

  @Get('summary/:billingMonth')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  async getMonthSummary(@Param('billingMonth') billingMonth: string) {
    return this.billingService.getMonthSummary(billingMonth);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BILLING_VIEW)
  async findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.BILLING_EDIT)
  async update(
    @Param('id') id: string,
    @Body() body: { items?: Array<{ itemName: string; originalAmount: number; discountAmount?: number }>; note?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.update(id, body, userId);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BILLING_DELETE)
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.delete(id, userId);
  }

  @Patch(':id/issue')
  @RequirePermissions(PERMISSIONS.BILLING_ISSUE)
  async issue(
    @Param('id') id: string,
    @Body() dto: IssueBillingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.issue(id, dto.dueDate, userId);
  }

  @Post(':id/payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_COLLECT)
  async registerPayment(
    @Param('id') billingId: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.registerPayment(billingId, dto, userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.BILLING_ISSUE)
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.billingService.cancel(id, body.reason, userId);
  }
}

