import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
} from './categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(201)
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.createCategory(createCategoryDto);
  }

  @Get()
  getCategories(@Query() query: CategoryQueryDto) {
    return this.categoriesService.getCategories(query);
  }

  @Get('tree')
  getCategoryTree() {
    return this.categoriesService.getCategoryTree();
  }

  @Get('flat')
  getAllCategoriesFlat() {
    return this.categoriesService.getAllCategoriesFlat();
  }

  @Get('leaf')
  getLeafCategories() {
    return this.categoriesService.getLeafCategories();
  }

  @Get('stats')
  getCategoryStats(@Query() query: CategoryQueryDto) {
    return this.categoriesService.getCategoryStats(query);
  }

  @Get(':id')
  getCategoryById(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(Number(id));
  }

  @Get(':id/subcategories')
  getSubcategories(@Param('id') id: string) {
    return this.categoriesService.getSubcategories(Number(id));
  }

  @Put(':id')
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(Number(id), updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(200)
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(Number(id));
  }
}
