import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeaveModule } from './leave/leave.module';
import { ExpenseModule } from './expense/expense.module';
import { ApprovalModule } from './approval/approval.module';
import { PurchaseModule } from './purchase/purchase.module';
import { ConfigModule } from './config/config.module';
import { User } from './users/user.entity';
import { LeaveApplication } from './leave/leave.entity';
import { ExpenseApplication } from './expense/expense.entity';
import { ApprovalRecord } from './approval/approval.entity';
import { PurchaseApplication } from './purchase/purchase.entity';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'bmp_user',
      password: process.env.DB_PASSWORD || 'bmp_password',
      database: process.env.DB_NAME || 'bmp_db',
      entities: [User, LeaveApplication, ExpenseApplication, ApprovalRecord, PurchaseApplication],
      synchronize: true,
      logging: true,
    }),
    AuthModule,
    UsersModule,
    LeaveModule,
    ExpenseModule,
    ApprovalModule,
    PurchaseModule,
    ConfigModule,
  ],
})
export class AppModule {}