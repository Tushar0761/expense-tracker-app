import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpenseUploadController } from './expense-upload.controller';
import { ExpenseUploadService } from './expense-upload.service';

@Module({
  controllers: [ExpenseUploadController],
  providers: [ExpenseUploadService, PrismaService],
})
export class ExpenseUploadModule {}
