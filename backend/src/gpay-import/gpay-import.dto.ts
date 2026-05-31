import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GpayRowDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  account: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  userName: string;
}

export class GpayImportPreviewDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpayRowDto)
  rows: GpayRowDto[];
}

export class GpayConfirmRowDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  account: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  userName: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  accountId?: number;

  @IsOptional()
  skip?: boolean;
}

export class GpayConfirmImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GpayConfirmRowDto)
  rows: GpayConfirmRowDto[];
}
