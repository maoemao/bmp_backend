import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { PurchaseApplication } from './purchase.entity';
import { ApprovalRecord } from '../approval/approval.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseApplication, ApprovalRecord]), UsersModule],
  providers: [PurchaseService],
  controllers: [PurchaseController],
})
export class PurchaseModule {}