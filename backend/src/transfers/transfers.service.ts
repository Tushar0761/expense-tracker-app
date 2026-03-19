import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateTransferDto } from './transfers.dto';

@Injectable()
export class TransfersService {
  private prisma = new PrismaClient();

  async create(dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different',
      );
    }

    // Note: Account balance is manual - transfers do NOT auto-update balance
    // User must manually update account balances if needed

    return this.prisma.transfer_data_master.create({
      data: {
        date: new Date(dto.date),
        amount: dto.amount,
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        remarks: dto.remarks,
      },
    });
  }

  async findAll() {
    return this.prisma.transfer_data_master.findMany({
      include: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async remove(id: number) {
    const transfer = await this.prisma.transfer_data_master.findUnique({
      where: { id },
    });
    if (!transfer) throw new BadRequestException('Transfer not found');

    // Note: Account balance is manual - deleting transfer does NOT revert balance

    return this.prisma.transfer_data_master.delete({ where: { id } });
  }
}
