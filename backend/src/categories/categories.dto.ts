import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  level?: number;
}

export class UpdateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CategoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(3)
  level?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class CategoryStatsQueryDto extends CategoryQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeChildren?: boolean;
}
