import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  CreateAccountDto,
  UpdateAccountDto,
  UpdateBalanceDto,
} from './accounts.dto';

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

  async updateBalance(id: number, dto: UpdateBalanceDto) {
    const account = await this.prisma.account_master.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException('Account not found');

    return await this.prisma.account_master.update({
      where: { id },
      data: { balance: dto.balance },
    });
  }
}
