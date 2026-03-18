import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateAccountDto, UpdateAccountDto, AdjustBalanceDto } from './accounts.dto';

@Injectable()
export class AccountsService {
  private prisma = new PrismaClient();

  async create(dto: CreateAccountDto) {
    return await this.prisma.account_master.create({
      data: dto,
    });
  }

  async findAll() {
    return await this.prisma.account_master.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { adjustments: true } }
      }
    });
  }

  async findOne(id: number) {
    const account = await this.prisma.account_master.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(id: number, dto: UpdateAccountDto) {
    return await this.prisma.account_master.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    return await this.prisma.account_master.delete({
      where: { id },
    });
  }

  async adjustBalance(id: number, dto: AdjustBalanceDto) {
    return await this.prisma.$transaction(async (tx) => {
      const account = await tx.account_master.findUnique({ where: { id } });
      if (!account) throw new NotFoundException('Account not found');

      const adjustment = await tx.account_balance_adjustment.create({
        data: {
          accountId: id,
          amount: dto.amount,
          reason: dto.reason,
        },
      });

      const updatedAccount = await tx.account_master.update({
        where: { id },
        data: {
          balance: { increment: dto.amount },
        },
      });

      return {
        adjustment,
        account: updatedAccount,
      };
    });
  }

  async getAdjustments(accountId: number) {
    return await this.prisma.account_balance_adjustment.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
