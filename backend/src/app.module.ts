import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { LoansModule } from './loans/loans.module';

import { AccountsModule } from './accounts/accounts.module';
import { TransfersModule } from './transfers/transfers.module';
import { ExpenseUploadModule } from './expense-upload/expense-upload.module';

@Module({
  imports: [
    LoansModule,
    ExpensesModule,
    CategoriesModule,
    AccountsModule,
    TransfersModule,
    ExpenseUploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
