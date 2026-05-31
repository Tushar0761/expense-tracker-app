import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GpayConfirmImportDto } from './gpay-import.dto';
import { GpayImportService } from './gpay-import.service';

@Controller('gpay-import')
export class GpayImportController {
  constructor(private readonly service: GpayImportService) {}

  /** Download the GPay CSV template with correct column format + sample rows */
  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const csv = this.service.generateCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gpay_import_template.csv"',
    );
    res.send(csv);
  }

  /** Upload a GPay CSV and get back enriched preview rows with auto-matched categories */
  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async preview(@UploadedFile() file: Express.Multer.File) {
    const csvText = file.buffer.toString('utf-8');
    return this.service.previewCsv(csvText);
  }

  /** Confirm the reviewed rows and insert them as expenses */
  @Post('confirm')
  @HttpCode(201)
  async confirm(@Body() dto: GpayConfirmImportDto) {
    return this.service.confirmImport(dto.rows);
  }

  /** Return all unique userName values with their auto-matched canonical names */
  @Get('name-variants')
  findNameVariants() {
    return this.service.findNameVariants();
  }

  /** Return merchants that appear under multiple categories (inconsistencies) */
  @Get('inconsistencies')
  findInconsistencies() {
    return this.service.findInconsistencies();
  }

  /** Re-categorise all expenses for a userName to a single categoryId */
  @Put('fix-inconsistency/:userName')
  fixInconsistency(
    @Param('userName') userName: string,
    @Body('categoryId') categoryId: number,
  ) {
    return this.service.fixInconsistency(userName, categoryId);
  }
}
