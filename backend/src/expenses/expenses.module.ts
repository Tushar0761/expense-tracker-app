import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  providers: [PrismaService, ExpensesService],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
