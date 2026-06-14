import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  supplier?: string;
}