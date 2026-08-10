import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpsertBudgetDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  discretionaryBudget: number;
}
