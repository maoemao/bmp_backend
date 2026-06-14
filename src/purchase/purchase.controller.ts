import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ApprovalDto } from './dto/approval.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('purchase')
@UseGuards(AuthGuard('jwt'))
export class PurchaseController {
  constructor(private purchaseService: PurchaseService) {}

  @Post('apply')
  async create(@Body() createPurchaseDto: CreatePurchaseDto, @Request() req) {
    return this.purchaseService.create(createPurchaseDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.purchaseService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.purchaseService.findOne(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.purchaseService.approve(id, req.user.userId, req.user.role, approvalDto);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.purchaseService.reject(id, req.user.userId, req.user.role, approvalDto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.purchaseService.cancel(id, req.user.userId);
  }
}