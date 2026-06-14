import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { QueryApprovalDto } from './dto/query-approval.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApplicationType } from './approval.entity';

@Controller('approval')
@UseGuards(AuthGuard('jwt'))
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Get('list')
  async findAll(@Query() query: QueryApprovalDto, @Request() req) {
    return this.approvalService.findAll(req.user.userId, req.user.role, query);
  }

  @Get(':type/:id')
  async findOne(
    @Param('type') type: ApplicationType,
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.approvalService.findOne(type, id, req.user.userId, req.user.role);
  }
}