import { Controller, Get } from '@nestjs/common';
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

  @Get('insight')
  async getInsight() {
    return await this.loansService.getInsightData();
  }

  @Get('graph')
  getGraph(): LoanGraphPoint[] {
    return this.loansService.getGraphData();
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
}
