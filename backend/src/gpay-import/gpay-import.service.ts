import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import { GpayConfirmRowDto } from './gpay-import.dto';
import {
  matchMerchant,
  TRANSFER_AMOUNT_THRESHOLD,
} from './merchant-map';

export type GpayPreviewRow = {
  rowIndex: number;
  date: string;
  amount: number;
  account: string;
  note: string;
  userName: string;
  // Auto-matched fields
  categoryId: number | null;
  categoryName: string | null;
  remarks: string | null;
  canonicalName: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  isTransfer: boolean;
  financeSubtype: string | null;
  needsReview: boolean;
  reviewReason: string | null;
};

@Injectable()
export class GpayImportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse a GPay CSV string and return enriched preview rows with
   * auto-assigned categories and flags for manual review.
   */
  async previewCsv(csvText: string): Promise<GpayPreviewRow[]> {
    const rows = this.parseCsv(csvText);
    const accounts = await this.prisma.account_master.findMany();

    return rows.map((row, idx) => {
      const match = matchMerchant(row.userName, row.note);
      const accountId = this.resolveAccount(row.account, accounts);

      // Flag for review if:
      // - no category match
      // - low confidence match
      // - large amount with no match
      // - looks like a personal transfer (no match, amount > threshold)
      let needsReview = false;
      let reviewReason: string | null = null;

      if (!match) {
        needsReview = true;
        reviewReason = 'Unknown merchant — select a category';
      } else if (match.isTransfer) {
        needsReview = true;
        reviewReason = `Finance: ${match.financeSubtype?.replace(/_/g, ' ')} — confirm or skip`;
      } else if (match.confidence === 'low') {
        needsReview = true;
        reviewReason = 'Low confidence match — please verify';
      } else if (row.amount >= TRANSFER_AMOUNT_THRESHOLD && match.confidence !== 'high') {
        needsReview = true;
        reviewReason = `Large amount ₹${row.amount} — verify category`;
      }

      return {
        rowIndex: idx,
        date: row.date,
        amount: row.amount,
        account: row.account,
        accountId: accountId ?? null,
        note: row.note ?? '',
        userName: row.userName,
        categoryId: match?.categoryId ?? null,
        categoryName: null, // resolved in controller from categories
        remarks: match?.remarks ?? row.note ?? null,
        canonicalName: match?.canonicalName ?? null,
        confidence: match?.confidence ?? null,
        isTransfer: match?.isTransfer ?? false,
        financeSubtype: match?.financeSubtype ?? null,
        needsReview,
        reviewReason,
      } as GpayPreviewRow & { accountId: number | null };
    });
  }

  /**
   * Confirm and save the reviewed rows into expenses_data_master.
   * Skips rows marked skip=true or with no categoryId.
   */
  async confirmImport(rows: GpayConfirmRowDto[]): Promise<{ inserted: number; skipped: number }> {
    const toInsert = rows.filter((r) => !r.skip && r.categoryId);
    const skipped = rows.length - toInsert.length;

    await this.prisma.$transaction(async (tx) => {
      for (const row of toInsert) {
        await tx.expenses_data_master.create({
          data: {
            date: new Date(row.date),
            amount: row.amount,
            remarks: row.remarks ?? row.note ?? null,
            accountId: row.accountId ?? null,
            categoryId: row.categoryId!,
            userName: row.userName,
          },
        });
      }
    });

    return { inserted: toInsert.length, skipped };
  }

  /**
   * Return all unique userName values from expenses_data_master
   * alongside the canonical form from the merchant map.
   * Used by the "Data Clinic" duplicate name finder.
   */
  async findNameVariants(): Promise<
    { userName: string; count: number; canonicalName: string | null; categoryId: number | null }[]
  > {
    const grouped = await this.prisma.expenses_data_master.groupBy({
      by: ['userName'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return grouped
      .filter((g) => g.userName)
      .map((g) => {
        const match = matchMerchant(g.userName!);
        return {
          userName: g.userName!,
          count: g._count.id,
          canonicalName: match?.canonicalName ?? null,
          categoryId: match?.categoryId ?? null,
        };
      });
  }

  /**
   * Generate the GPay CSV template as a string.
   * Returns the exact column format this service expects, with a sample row.
   */
  generateCsvTemplate(): string {
    const header = 'id,date,amount,account,category,note,userName';
    const sample1 = `,2026-05-01,250,SBI Credit Card XX76,,Petrol,ARJUNPETROLEUM`;
    const sample2 = `,2026-05-01,68,SBI Credit Card XX76,,Milk,KrishnaDairy`;
    const sample3 = `,2026-05-02,1597,SBI Credit Card XX76,,Groceries,STARBAZAAR`;
    const sample4 = `,2026-05-03,25,Bank of Baroda 9136,,Metro ticket,GUJARATMETRORAILC`;
    return [header, sample1, sample2, sample3, sample4].join('\n');
  }

  /**
   * Find merchants (userNames) that appear under more than one category
   * across all existing expenses. These are inconsistencies to fix.
   */
  async findInconsistencies(): Promise<
    {
      userName: string;
      canonicalName: string | null;
      categories: { categoryId: number; categoryName: string; count: number }[];
      recommendedCategoryId: number | null;
      recommendedCategoryName: string | null;
      totalExpenses: number;
    }[]
  > {
    // Group by userName + categoryId to get counts
    const grouped = await this.prisma.expenses_data_master.groupBy({
      by: ['userName', 'categoryId'],
      _count: { id: true },
      where: { userName: { not: null } },
      orderBy: [{ userName: 'asc' }, { _count: { id: 'desc' } }],
    });

    // Fetch all categories for name lookup
    const allCats = await this.prisma.category_master.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const catMap = new Map(allCats.map((c) => [c.id, c]));

    const getCatName = (id: number) => {
      const cat = catMap.get(id);
      if (!cat) return 'Unknown';
      if (cat.parentId) {
        const parent = catMap.get(cat.parentId);
        if (parent?.parentId) {
          const gp = catMap.get(parent.parentId);
          return gp ? `${gp.name} > ${parent.name} > ${cat.name}` : `${parent.name} > ${cat.name}`;
        }
        return parent ? `${parent.name} > ${cat.name}` : cat.name;
      }
      return cat.name;
    };

    // Aggregate by userName
    const byUser = new Map<string, { categoryId: number; count: number }[]>();
    for (const row of grouped) {
      if (!row.userName) continue;
      if (!byUser.has(row.userName)) byUser.set(row.userName, []);
      byUser.get(row.userName)!.push({ categoryId: row.categoryId, count: row._count.id });
    }

    const results: {
      userName: string;
      canonicalName: string | null;
      categories: { categoryId: number; categoryName: string; count: number }[];
      recommendedCategoryId: number | null;
      recommendedCategoryName: string | null;
      totalExpenses: number;
    }[] = [];
    for (const [userName, cats] of byUser) {
      if (cats.length <= 1) continue; // only one category — no inconsistency

      const match = matchMerchant(userName);
      const totalExpenses = cats.reduce((s, c) => s + c.count, 0);

      // Recommended = merchant-map match > most frequent category
      let recommendedCategoryId: number | null = null;
      let recommendedCategoryName: string | null = null;
      if (match && match.categoryId > 0) {
        recommendedCategoryId = match.categoryId;
        recommendedCategoryName = getCatName(match.categoryId);
      } else {
        // Most frequent
        const top = cats.sort((a, b) => b.count - a.count)[0];
        recommendedCategoryId = top.categoryId;
        recommendedCategoryName = getCatName(top.categoryId);
      }

      results.push({
        userName,
        canonicalName: match?.canonicalName ?? null,
        categories: cats.map((c) => ({
          categoryId: c.categoryId,
          categoryName: getCatName(c.categoryId),
          count: c.count,
        })),
        recommendedCategoryId,
        recommendedCategoryName,
        totalExpenses,
      });
    }

    return results.sort((a, b) => b.totalExpenses - a.totalExpenses);
  }

  /**
   * Bulk re-categorise all expenses for a given userName to a single categoryId.
   */
  async fixInconsistency(
    userName: string,
    categoryId: number,
  ): Promise<{ updated: number }> {
    const result = await this.prisma.expenses_data_master.updateMany({
      where: { userName },
      data: { categoryId },
    });
    return { updated: result.count };
  }

  /**
   * Parse the GPay CSV export format:
   * id, date, amount, account, category, note, userName
   */
  private parseCsv(csv: string): {
    date: string;
    amount: number;
    account: string;
    note: string;
    userName: string;
  }[] {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Skip header row
    const header = lines[0].toLowerCase();
    const startIdx = header.includes('date') ? 1 : 0;

    return lines.slice(startIdx).map((line) => {
      // Handle comma-separated with possible spaces around values
      const cols = line.split(',').map((c) => c.trim());
      // CSV columns: id, date, amount, account, category, note, userName
      // id (0) may be blank, date (1), amount (2), account (3), category (4), note (5), userName (6)
      const date = this.parseDate(cols[1] ?? '');
      const amount = parseFloat((cols[2] ?? '0').replace(/[,\s]/g, ''));
      const account = cols[3] ?? '';
      const note = cols[5] ?? '';
      const userName = cols[6] ?? '';
      return { date, amount, account, note, userName };
    });
  }

  private parseDate(raw: string): string {
    // Handles yyyy-MM-dd, dd-MM-yyyy, dd/MM/yyyy
    raw = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parts = raw.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return raw; // already yyyy-MM-dd
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return raw;
  }

  private resolveAccount(
    accountStr: string,
    accounts: { id: number; name: string }[],
  ): number | null {
    const norm = accountStr.toLowerCase();
    const found = accounts.find(
      (a) =>
        norm.includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(norm.replace(/\s+/g, ' ').trim()),
    );
    return found?.id ?? null;
  }
}
