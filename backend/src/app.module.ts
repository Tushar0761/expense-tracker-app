import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingMiddleware } from './logging.middleware';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { GpayImportModule } from './gpay-import/gpay-import.module';
import { LoansModule } from './loans/loans.module';

import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { ExpenseUploadModule } from './expense-upload/expense-upload.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    LoansModule,
    ExpensesModule,
    CategoriesModule,
    AccountsModule,
    TransfersModule,
    ExpenseUploadModule,
    GpayImportModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
