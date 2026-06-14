import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApprovalDto } from './dto/approval.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('leave')
@UseGuards(AuthGuard('jwt'))
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Post('apply')
  async create(@Body() createLeaveDto: CreateLeaveDto, @Request() req) {
    return this.leaveService.create(createLeaveDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.leaveService.findAll(req.user.userId, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Put(':id/approve')
  async approve(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.leaveService.approve(id, req.user.userId, req.user.role, approvalDto);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string, @Body() approvalDto: ApprovalDto, @Request() req) {
    return this.leaveService.reject(id, req.user.userId, req.user.role, approvalDto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.leaveService.cancel(id, req.user.userId);
  }
}