import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApprovalDto } from './dto/approval.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('expense')
@UseGuards(AuthGuard('jwt'))
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  @Post('apply')
  async create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expenseService.create(createExpenseDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.expenseService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.expenseService.findOne(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.expenseService.approve(id, req.user.userId, req.user.role, approvalDto);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.expenseService.reject(id, req.user.userId, req.user.role, approvalDto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.expenseService.cancel(id, req.user.userId);
  }
}