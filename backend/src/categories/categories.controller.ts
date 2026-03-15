import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { CreateCategoryDto } from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('create')
  @HttpCode(201)
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.createCategory(createCategoryDto);
  }

  @Get()
  getCategories() {
    return this.categoriesService.getCategories();
  }

  @Get('flat')
  getAllCategoriesFlat() {
    return this.categoriesService.getAllCategoriesFlat();
  }

  @Get(':id/subcategories')
  getSubcategories(@Param('id') id: string) {
    return this.categoriesService.getSubcategories(Number(id));
  }

  @Delete(':id')
  @HttpCode(200)
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(Number(id));
  }
}
