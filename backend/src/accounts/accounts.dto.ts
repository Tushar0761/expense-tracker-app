import { account_type } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(account_type)
  @IsNotEmpty()
  type: account_type;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(account_type)
  @IsOptional()
  type?: account_type;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;
}

export class AdjustBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
