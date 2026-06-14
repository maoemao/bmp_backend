import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApplicationType } from '../approval.entity';

export enum ApprovalStatusFilter {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  IN_PROGRESS = 'IN_PROGRESS',
}

export class QueryApprovalDto {
  @IsOptional()
  @IsEnum(ApplicationType)
  type?: ApplicationType;

  @IsOptional()
  @IsEnum(ApprovalStatusFilter)
  status?: ApprovalStatusFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}