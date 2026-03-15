import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateTransferDto } from './transfers.dto';

@Injectable()
export class TransfersService {
  private prisma = new PrismaClient();

  async create(dto: CreateTransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Record the transfer
      const transfer = await tx.transfer_data_master.create({
        data: {
          date: new Date(dto.date),
          amount: dto.amount,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          remarks: dto.remarks,
        },
      });

      // 2. Update Source Account balance (Decrease)
      await tx.account_master.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: dto.amount } },
      });

      // 3. Update Destination Account balance (Increase)
      await tx.account_master.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: dto.amount } },
      });

      return transfer;
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
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer_data_master.findUnique({ where: { id } });
      if (!transfer) throw new BadRequestException('Transfer not found');

      // Revert balances
      await tx.account_master.update({
        where: { id: transfer.fromAccountId },
        data: { balance: { increment: transfer.amount } },
      });
      await tx.account_master.update({
        where: { id: transfer.toAccountId },
        data: { balance: { decrement: transfer.amount } },
      });

      return tx.transfer_data_master.delete({ where: { id } });
    });
  }
}
