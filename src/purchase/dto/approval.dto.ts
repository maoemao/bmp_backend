import { IsOptional } from 'class-validator';

export class ApprovalDto {
  @IsOptional()
  comment?: string;
}