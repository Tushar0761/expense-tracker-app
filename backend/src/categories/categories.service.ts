import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async createCategory(payload: CreateCategoryDto) {
    return this.prisma.category_master.create({
      data: {
        name: payload.name,
        parentId: payload.parentId,
      },
    });
  }

  async getCategories() {
    // Get all top-level categories with their subcategories
    const categories = await this.prisma.category_master.findMany({
      where: { parentId: null },
      include: {
        children: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      subCategories: cat.children,
    }));
  }

  async getAllCategoriesFlat() {
    const categories = await this.prisma.category_master.findMany({
      select: { id: true, name: true, parentId: true },
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
        parentId: cat.parentId,
        parentName,
      };
    });
  }

  async getSubcategories(categoryId: number) {
    // Verify category exists
    const category = await this.prisma.category_master.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }

    return this.prisma.category_master.findMany({
      where: { parentId: categoryId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.category_master.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return this.prisma.category_master.delete({
      where: { id },
    });
  }
}
