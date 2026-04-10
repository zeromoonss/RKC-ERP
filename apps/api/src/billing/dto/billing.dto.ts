import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class BillingItemDto {
  @IsString()
  itemName: string;

  @IsNumber()
  @Min(0)
  originalAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  promotionId?: string;

  @IsOptional()
  @IsString()
  promotionName?: string;
}

export class CreateBillingDto {
  @IsString()
  studentId: string;

  @IsDateString()
  billingMonth: string; // YYYY-MM-01

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillingItemDto)
  items: BillingItemDto[];
}

export class QueryBillingDto {
  @IsOptional()
  @IsString()
  billingMonth?: string; // YYYY-MM

  @IsOptional()
  @IsEnum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsEnum(['KINDERGARTEN', 'ACADEMY', 'BOTH'])
  programType?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 50;
}

export class IssueBillingDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RegisterPaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'])
  paymentMethod: string;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
