import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { ExpenseApplication } from './expense.entity';
import { ApprovalRecord } from '../approval/approval.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseApplication, ApprovalRecord]), UsersModule],
  providers: [ExpenseService],
  controllers: [ExpenseController],
})
export class ExpenseModule {}