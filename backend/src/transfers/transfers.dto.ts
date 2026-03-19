import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTransferDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  fromAccountId: number;

  @IsNumber()
  @IsNotEmpty()
  toAccountId: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}
