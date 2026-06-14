import { IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../user.entity';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  name?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsOptional()
  department?: string;

  @IsOptional()
  managerId?: string;
}