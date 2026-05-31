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
  BulkUpdateExpenseDto,
  CreateExpenseDto,
  ExpenseDashboardSummaryQueryDto,
  ExpenseQueryDto,
  ExpenseSummaryQueryDto,
  SplitExpenseDto,
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

  @Get('account-totals')
  getAccountTotals(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expensesService.getAccountWiseTotals(startDate, endDate);
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

  @Put('bulk-update')
  bulkUpdate(@Body() body: BulkUpdateExpenseDto) {
    return this.expensesService.bulkUpdateExpenses(body.ids, {
      categoryId: body.categoryId,
      remarks: body.remarks,
    });
  }

  @Get('suggestions')
  getSuggestions(@Query('userName') userName: string) {
    return this.expensesService.getSuggestionsForUser(userName);
  }

  @Get('duplicates')
  getDuplicates(
    @Query('byDate') byDate?: string,
    @Query('byAmount') byAmount?: string,
    @Query('byName') byName?: string,
  ) {
    return this.expensesService.getDuplicates({
      byDate: byDate !== 'false',
      byAmount: byAmount !== 'false',
      byName: byName !== 'false',
    });
  }

  @Get()
  getExpenses(@Query() query: ExpenseQueryDto) {
    return this.expensesService.getExpenses(query);
  }

  @Get(':id')
  getExpenseById(@Param('id') id: string) {
    return this.expensesService.getExpenseById(Number(id));
  }

  @Post(':id/split')
  @HttpCode(201)
  splitExpense(
    @Param('id') id: string,
    @Body() splitExpenseDto: SplitExpenseDto,
  ) {
    return this.expensesService.splitExpense(Number(id), splitExpenseDto);
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
