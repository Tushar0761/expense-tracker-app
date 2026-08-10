import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertBudgetDto } from './budget.dto';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async get() {
    return this.prisma.budget_setting.findFirst({
      orderBy: { id: 'asc' },
    });
  }

  async upsert(dto: UpsertBudgetDto) {
    const existing = await this.prisma.budget_setting.findFirst({
      orderBy: { id: 'asc' },
    });

    if (existing) {
      return this.prisma.budget_setting.update({
        where: { id: existing.id },
        data: { discretionaryBudget: dto.discretionaryBudget },
      });
    }

    return this.prisma.budget_setting.create({
      data: { discretionaryBudget: dto.discretionaryBudget },
    });
  }
}
