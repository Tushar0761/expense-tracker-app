import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateExpenseDto,
  ExpenseDashboardSummaryQueryDto,
  ExpenseQueryDto,
  ExpenseSummaryQueryDto,
  UpdateExpenseDto,
} from './expenses.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('create')
  @HttpCode(201)
  createExpense(@Body() createExpenseDto: CreateExpenseDto) {
    return this.expensesService.createExpense(createExpenseDto);
  }

  @Post('bulk-create')
  @HttpCode(201)
  bulkCreateExpenses(@Body() createExpenseDtos: CreateExpenseDto[]) {
    return this.expensesService.bulkCreateExpenses(createExpenseDtos);
  }

  @Get('summary')
  getSummary(@Query() query: ExpenseSummaryQueryDto) {
    return this.expensesService.getExpenseSummary(query);
  }

  @Get('category-totals')
  getCategoryTotals(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getCategoryWiseTotals(startDate, endDate);
  }

  @Get('dashboard')
  getDashboardKPIs(@Query() query?: ExpenseDashboardSummaryQueryDto) {
    return this.expensesService.getDashboardKPIs(
      query?.startDate,
      query?.endDate,
      query?.type,
    );
  }

  @Get()
  getExpenses(@Query() query: ExpenseQueryDto) {
    return this.expensesService.getExpenses(query);
  }

  @Get(':id')
  getExpenseById(@Param('id') id: string) {
    return this.expensesService.getExpenseById(Number(id));
  }

  @Put(':id')
  updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(Number(id), updateExpenseDto);
  }

  @Delete(':id')
  @HttpCode(200)
  deleteExpense(@Param('id') id: string) {
    return this.expensesService.deleteExpense(Number(id));
  }
}
