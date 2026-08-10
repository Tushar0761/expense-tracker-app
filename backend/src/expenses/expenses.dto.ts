import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { spend_type } from '@prisma/client';

export type SpendTypeFilter = 'ALL' | 'FIXED' | 'DISCRETIONARY';

/** Parses a comma-separated query string ("3,7,12") into number[]; leaves arrays/undefined as-is. */
function parseCsvNumbers({ value }: { value: unknown }): number[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const nums = raw.map((v) => Number(v)).filter((n) => !isNaN(n));
  return nums.length > 0 ? nums : undefined;
}

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

  @IsOptional()
  @IsEnum(spend_type)
  spendType?: spend_type;
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

  @IsOptional()
  @IsEnum(spend_type)
  spendType?: spend_type;
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

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountMax?: number;

  @IsOptional()
  @IsString()
  spendTypeFilter?: SpendTypeFilter;

  @IsOptional()
  @Transform(parseCsvNumbers)
  @IsArray()
  @IsNumber({}, { each: true })
  excludeCategoryIds?: number[];
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

  @IsOptional()
  @IsString()
  spendTypeFilter?: SpendTypeFilter;

  @IsOptional()
  @Transform(parseCsvNumbers)
  @IsArray()
  @IsNumber({}, { each: true })
  excludeCategoryIds?: number[];
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

  @IsOptional()
  @IsString()
  spendTypeFilter?: SpendTypeFilter;

  @IsOptional()
  @Transform(parseCsvNumbers)
  @IsArray()
  @IsNumber({}, { each: true })
  excludeCategoryIds?: number[];
}

export class BulkUpdateExpenseDto {
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsEnum(spend_type)
  spendType?: spend_type;
}

export class SplitItemDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsOptional()
  accountId?: number;

  @IsDateString()
  @IsOptional()
  date?: string;
}

export class SplitExpenseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  items: SplitItemDto[];
}
