import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExpenseUploadService } from './expense-upload.service';

@Controller('expense-excel')
export class ExpenseUploadController {
  constructor(private readonly expenseUploadService: ExpenseUploadService) {}

  @Get('template')
  async downloadTemplate(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    try {
      const buffer = await this.expenseUploadService.generateTemplate(
        year ? parseInt(year, 10) : undefined,
        month ? parseInt(month, 10) : undefined,
      );

      const filename =
        year && month
          ? `expenses_${year}_${month.toString().padStart(2, '0')}.xlsx`
          : 'expense_template.xlsx';

      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });

      res.end(buffer);
    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({
        message: 'Failed to generate template',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Please upload .xlsx or .csv file.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const result = await this.expenseUploadService.processUpload(file.buffer);

    return result;
  }
}
