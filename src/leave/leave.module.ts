import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { LeaveApplication } from './leave.entity';
import { ApprovalRecord } from '../approval/approval.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveApplication, ApprovalRecord]), UsersModule],
  providers: [LeaveService],
  controllers: [LeaveController],
})
export class LeaveModule {}