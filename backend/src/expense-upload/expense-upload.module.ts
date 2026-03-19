import { Module } from '@nestjs/common';
import { ExpenseUploadController } from './expense-upload.controller';
import { ExpenseUploadService } from './expense-upload.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ExpenseUploadController],
  providers: [ExpenseUploadService, PrismaService],
})
export class ExpenseUploadModule {}
