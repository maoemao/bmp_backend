import { IsDateString, IsOptional } from 'class-validator';

export class CreateLeaveDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsOptional()
  reason?: string;
}