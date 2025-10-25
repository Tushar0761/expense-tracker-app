import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  providers: [PrismaService, LoansService],
  controllers: [LoansController],
})
export class LoansModule {}
