import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  BulkCreateFuturePaymentDto,
  CreateLoanDto,
  RecordPaymentDto,
} from './loans.dto';
import {
  EmiPaymentRow,
  FuturePaymentRow,
  LoanGraphPoint,
  LoansService,
  LoanTableRow,
} from './loans.service';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('create')
  @HttpCode(201)
  createLoanController(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.createLoanService(createLoanDto);
  }

  @Post('add-borrower')
  @HttpCode(201)
  addBorrowerController(@Body() payload: { borrowerName: string }) {
    return this.loansService.addBorrower(payload);
  }

  @Post('record-payment')
  @HttpCode(201)
  recordPaymentController(@Body() recordPaymentDto: RecordPaymentDto) {
    return this.loansService.recordPaymentService(recordPaymentDto);
  }

  @Post('bulk-future-payments')
  @HttpCode(201)
  bulkCreateFuturePayments(@Body() payload: BulkCreateFuturePaymentDto) {
    return this.loansService.bulkCreateFuturePayments(payload);
  }

  @Get('insight')
  async getInsight() {
    return await this.loansService.getInsightData();
  }

  @Get('graph')
  async getGraph(): Promise<LoanGraphPoint[]> {
    return await this.loansService.getGraphData();
  }

  @Get('table')
  async getTable(): Promise<LoanTableRow[]> {
    return await this.loansService.getTableData();
  }

  @Get('payments')
  async getEmiPayments(): Promise<EmiPaymentRow[]> {
    return await this.loansService.getEmiPayments();
  }

  @Get('future-payments')
  async getFuturePayments(): Promise<FuturePaymentRow[]> {
    return await this.loansService.getFuturePayments();
  }

  @Get('borrowers')
  async getBorrowers(): Promise<{ id: number; borrowerName: string }[]> {
    return await this.loansService.getBorrowers();
  }

  @Get('borrower/:borrowerId')
  async getLoansByBorrower(
    @Param('borrowerId') borrowerId: string,
  ): Promise<any> {
    return await this.loansService.getLoansByBorrower(Number(borrowerId));
  }

  @Get(':loanId/future-payments')
  async getFuturePaymentsByLoan(@Param('loanId') loanId: string): Promise<any> {
    return await this.loansService.getFuturePaymentsByLoan(Number(loanId));
  }

  @Get(':loanId/planning-summary')
  async getLoanPlanningSummary(@Param('loanId') loanId: string): Promise<any> {
    return await this.loansService.getLoanPlanningSummary(Number(loanId));
  }
}
