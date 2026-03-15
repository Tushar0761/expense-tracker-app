import { loans_master_status } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateLoanDto {
  @IsNotEmpty()
  @IsNumber()
  borrowerId: number;

  @IsNotEmpty()
  @IsEnum(loans_master_status)
  status: loans_master_status;

  @IsNumber()
  @IsNotEmpty()
  initialAmount: number;

  @IsNumber()
  @IsNotEmpty()
  interestRate: number;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'loanDate must be in yyyy-mm-dd format',
  })
  loanDate: string;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dueDate must be in yyyy-mm-dd format',
  })
  dueDate?: string | null;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  loanId: number;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'paymentDate must be in yyyy-mm-dd format',
  })
  paymentDate: string;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsNotEmpty()
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'other';

  @IsOptional()
  @IsNumber()
  futurePaymentId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  principalAmount?: number;

  @IsOptional()
  @IsNumber()
  interestAmount?: number;
}

export class FuturePaymentItemDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'plannedDate must be in yyyy-mm-dd format',
  })
  plannedDate: string;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsNumber()
  principalAmount?: number;

  @IsOptional()
  @IsNumber()
  interestAmount?: number;
}

export class BulkCreateFuturePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  loanId: number;

  @IsNotEmpty()
  items: FuturePaymentItemDto[];
}
