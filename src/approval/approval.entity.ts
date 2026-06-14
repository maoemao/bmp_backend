import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { LeaveApplication } from '../leave/leave.entity';
import { ExpenseApplication } from '../expense/expense.entity';
import { PurchaseApplication } from '../purchase/purchase.entity';

export enum ApplicationType {
  LEAVE = 'LEAVE',
  EXPENSE = 'EXPENSE',
  PURCHASE = 'PURCHASE',
}

@Entity('approval_records')
export class ApprovalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', nullable: false })
  applicationId: string;

  @Column({ nullable: false })
  applicationType: string;

  @Column({ name: 'approver_id', nullable: false })
  approverId: string;

  @ManyToOne(() => User, (user) => user.approvalRecords)
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  @Column({ nullable: false })
  approverRole: string;

  @Column({ nullable: false })
  status: string;

  @Column({ nullable: true, type: 'text' })
  comment: string;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  @ManyToOne(() => LeaveApplication, (leave) => leave.approvalRecords, { createForeignKeyConstraints: false })
  leaveApplication: LeaveApplication;

  @ManyToOne(() => ExpenseApplication, (expense) => expense.approvalRecords, { createForeignKeyConstraints: false })
  expenseApplication: ExpenseApplication;

  @ManyToOne(() => PurchaseApplication, (purchase) => purchase.approvalRecords, { createForeignKeyConstraints: false })
  purchaseApplication: PurchaseApplication;
}