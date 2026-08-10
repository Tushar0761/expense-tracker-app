import { Body, Controller, Get, Put } from '@nestjs/common';
import { UpsertBudgetDto } from './budget.dto';
import { BudgetService } from './budget.service';

@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  get() {
    return this.budgetService.get();
  }

  @Put()
  upsert(@Body() dto: UpsertBudgetDto) {
    return this.budgetService.upsert(dto);
  }
}
