import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  providers: [PrismaService, CategoriesService],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
