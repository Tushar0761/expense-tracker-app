/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async createCategory(payload: CreateCategoryDto) {
    let level = payload.level ?? 1;

    if (payload.parentId) {
      const parent = await this.prisma.category_master.findUnique({
        where: { id: payload.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${payload.parentId} not found`,
        );
      }

      if (parent.level >= 3) {
        throw new BadRequestException(
          'Cannot create child category: parent is already at maximum level (3)',
        );
      }

      if (level !== undefined && level !== parent.level + 1) {
        throw new BadRequestException(
          `Level must be ${parent.level + 1} when creating child of a level ${parent.level} category`,
        );
      }

      level = parent.level + 1;
    } else {
      if (level !== undefined && level !== 1) {
        throw new BadRequestException(
          'Level must be 1 when creating a root category (no parent)',
        );
      }
      level = 1;
    }

    const existingWithSameParent = await this.prisma.category_master.findFirst({
      where: {
        name: payload.name,
        parentId: payload.parentId ?? null,
      },
    });

    if (existingWithSameParent) {
      throw new BadRequestException(
        `Category with name "${payload.name}" already exists under this parent`,
      );
    }

    return this.prisma.category_master.create({
      data: {
        name: payload.name,
        parentId: payload.parentId,
        level,
      },
    });
  }

  async getCategories(query: CategoryQueryDto) {
    const whereClause: {
      level?: number;
      parentId?: number | null;
    } = {};

    if (query.level !== undefined) {
      whereClause.level = query.level;
    }

    if (query.parentId !== undefined) {
      whereClause.parentId = query.parentId;
    } else if (query.level === undefined) {
      whereClause.parentId = null;
    }

    const categories = await this.prisma.category_master.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => {
      let fullPath: string | null = null;
      let parentName: string | null = null;
      let parentLevel: number | null = null;

      if (cat.parent) {
        parentName = cat.parent.name;
        parentLevel = cat.parent.level;

        if (cat.parent.level === 1) {
          fullPath = `${cat.parent.name} > ${cat.name}`;
        } else if (cat.parent.level === 2) {
          const grandparent = cat.parent;
          if (grandparent) {
            fullPath = `${grandparent.name} > ${cat.parent.name} > ${cat.name}`;
          }
        }
      } else {
        fullPath = cat.name;
      }

      return {
        id: cat.id,
        name: cat.name,
        level: cat.level,
        parentId: cat.parentId,
        parentName,
        parentLevel,
        fullPath,
      };
    });
  }

  async getCategoryTree() {
    const allCategories = await this.prisma.category_master.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
      },
      orderBy: { name: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const buildTree = (parentId: number | null, level: number) => {
      const result: {
        id: number;
        name: string;
        level: number;
        children: ReturnType<typeof buildTree>;
      }[] = [];
      
      allCategories
        .filter((cat) => cat.parentId === parentId && cat.level === level)
        .forEach((cat) => {
          result.push({
            id: cat.id,
            name: cat.name,
            level: cat.level,
            children: level < 3 ? buildTree(cat.id, level + 1) : [],
          });
        });
      
      return result;
    };

    return buildTree(null, 1);
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.category_master.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    let fullPath: string | null = null;
    if (category.parent) {
      if (category.parent.level === 1) {
        fullPath = `${category.parent.name} > ${category.name}`;
      } else if (category.parent.level === 2) {
        fullPath = `... > ${category.parent.name} > ${category.name}`;
      }
    } else {
      fullPath = category.name;
    }

    return {
      ...category,
      fullPath,
    };
  }

  async updateCategory(id: number, payload: UpdateCategoryDto) {
    const category = await this.prisma.category_master.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const existingWithSameParent = await this.prisma.category_master.findFirst({
      where: {
        name: payload.name,
        parentId: category.parentId,
        id: { not: id },
      },
    });

    if (existingWithSameParent) {
      throw new BadRequestException(
        `Category with name "${payload.name}" already exists under this parent`,
      );
    }

    return this.prisma.category_master.update({
      where: { id },
      data: { name: payload.name },
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.category_master.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        _count: { select: { expenses_data_master: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete category: it has ${category.children.length} child(ren). Delete children first.`,
      );
    }

    if (category._count.expenses_data_master > 0) {
      throw new BadRequestException(
        `Cannot delete category: it has ${category._count.expenses_data_master} expense(s). Reassign them first.`,
      );
    }

    return this.prisma.category_master.delete({
      where: { id },
    });
  }

  async getAllCategoriesFlat() {
    const categories = await this.prisma.category_master.findMany({
      select: { id: true, name: true, level: true, parentId: true },
      orderBy: { name: 'asc' },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return categories.map((cat) => {
      let parentName: string | null = null;
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          if (parent.parentId) {
            const grandparent = categoryMap.get(parent.parentId);
            parentName = grandparent
              ? `${grandparent.name} > ${parent.name}`
              : parent.name;
          } else {
            parentName = parent.name;
          }
        }
      }
      return {
        id: cat.id,
        name: cat.name,
        level: cat.level,
        parentId: cat.parentId,
        parentName,
      };
    });
  }

  async getLeafCategories() {
    const categories = await this.prisma.category_master.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
        children: {
          select: { id: true },
        },
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
            parent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories
      .filter((cat) => cat.children.length === 0)
      .map((cat) => {
        let fullPath: string | null = null;
        let parentName: string | null = null;

        if (cat.parent) {
          parentName = cat.parent.name;
          if (cat.parent.level === 1) {
            fullPath = `${cat.parent.name} > ${cat.name}`;
          } else if (cat.parent.level === 2 && cat.parent.parent) {
            fullPath = `${cat.parent.parent.name} > ${cat.parent.name} > ${cat.name}`;
          } else if (cat.parent.level === 2) {
            fullPath = `${cat.parent.name} > ${cat.name}`;
          }
        } else {
          fullPath = cat.name;
        }

        return {
          id: cat.id,
          name: cat.name,
          level: cat.level,
          parentId: cat.parentId,
          parentName,
          fullPath,
        };
      });
  }

  async getSubcategories(categoryId: number) {
    const category = await this.prisma.category_master.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }

    return this.prisma.category_master.findMany({
      where: { parentId: categoryId },
      select: { id: true, name: true, level: true },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryStats(query: CategoryQueryDto) {
    // Simpler version to get build working
    const whereClause: {
      level?: number;
      parentId?: number | null;
    } = {};

    if (query.level !== undefined) {
      whereClause.level = query.level;
    }

    if (query.parentId !== undefined) {
      whereClause.parentId = query.parentId;
    }

    const categories = await this.prisma.category_master.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            expenses_data_master: {
              select: {
                amount: true,
              },
            },
          },
        },
        expenses_data_master: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => {
      const directAmount = cat.expenses_data_master.reduce(
        (sum, e) => sum + e.amount,
        0,
      );

      let totalWithChildren = directAmount;

      for (const child of cat.children) {
        const childAmount = child.expenses_data_master.reduce(
          (sum, e) => sum + e.amount,
          0,
        );
        totalWithChildren += childAmount;
      }

      const parentName = cat.parent?.name ?? null;

      const childrenSummary =
        query.level !== 3
          ? cat.children.map((child) => ({
              id: child.id,
              name: child.name,
              level: child.level,
              total_amount: child.expenses_data_master.reduce(
                (sum, e) => sum + e.amount,
                0,
              ),
              expense_count: child.expenses_data_master.length,
            }))
          : undefined;

      return {
        id: cat.id,
        name: cat.name,
        level: cat.level,
        parentId: cat.parentId,
        parentName,
        total_amount: directAmount,
        total_with_children: totalWithChildren,
        expense_count: cat.expenses_data_master.length,

        children_summary: childrenSummary,
      };
    });
  }
}
