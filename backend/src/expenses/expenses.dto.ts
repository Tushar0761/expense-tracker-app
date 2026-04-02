import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateExpenseDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number; // Single category (not array)

  @IsString()
  @IsOptional()
  userName?: string;

  @IsNumber()
  @IsOptional()
  emiPaymentId?: number;
}

export class UpdateExpenseDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsOptional()
  accountId?: number;

  @IsNumber()
  @IsOptional()
  categoryId?: number; // Single category (not array)

  @IsString()
  @IsOptional()
  userName?: string;

  @IsNumber()
  @IsOptional()
  emiPaymentId?: number;
}

export class ExpenseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountId?: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'date' | 'amount';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class ExpenseSummaryQueryDto {
  @IsOptional()
  @IsString()
  granularity?: 'day' | 'week' | 'month' | 'year' = 'month';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ExpenseDashboardSummaryQueryDto {
  @IsOptional()
  @IsString()
  type?: 'all' | 'month' | 'custom';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
