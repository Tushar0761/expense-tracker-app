import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateAccountDto, UpdateAccountDto, AdjustBalanceDto } from './accounts.dto';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.remove(id);
  }

  @Post(':id/adjust-balance')
  adjustBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.accountsService.adjustBalance(id, dto);
  }

  @Get(':id/adjustments')
  getAdjustments(@Param('id', ParseIntPipe) id: number) {
    return this.accountsService.getAdjustments(id);
  }
}
