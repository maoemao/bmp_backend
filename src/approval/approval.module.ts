import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalRecord } from './approval.entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { LeaveApplication } from '../leave/leave.entity';
import { ExpenseApplication } from '../expense/expense.entity';
import { PurchaseApplication } from '../purchase/purchase.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApprovalRecord,
      LeaveApplication,
      ExpenseApplication,
      PurchaseApplication,
      User,
    ]),
  ],
  providers: [ApprovalService],
  controllers: [ApprovalController],
  exports: [TypeOrmModule, ApprovalService],
})
export class ApprovalModule {}