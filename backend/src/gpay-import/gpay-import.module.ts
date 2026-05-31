import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma/prisma.service';
import { GpayImportController } from './gpay-import.controller';
import { GpayImportService } from './gpay-import.service';

@Module({
  imports: [
    MulterModule.register({}), // default memory storage — file stays in buffer
  ],
  controllers: [GpayImportController],
  providers: [GpayImportService, PrismaService],
})
export class GpayImportModule {}
