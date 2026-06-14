import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}