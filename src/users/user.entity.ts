import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { LeaveApplication } from '../leave/leave.entity';
import { ExpenseApplication } from '../expense/expense.entity';
import { ApprovalRecord } from '../approval/approval.entity';

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  FINANCE = 'FINANCE',
  DIRECTOR = 'DIRECTOR',
  ADMIN = 'ADMIN',
  IT = 'IT',
  PURCHASING = 'PURCHASING',
  CEO = 'CEO',
}

export enum Department {
  IT = 'IT部门',
  FINANCE = '财务部门',
  HR = 'HR部门',
  PURCHASING = '采购部门',
  EMPLOYEE = '普通员工部门',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ nullable: true })
  department: string;

  @Column({ name: 'manager_id', nullable: true })
  managerId: string;

  @Column({ name: 'need_password_change', default: false })
  needPasswordChange: boolean;

  @ManyToOne(() => User, (user) => user.subordinates)
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @OneToMany(() => User, (user) => user.manager)
  subordinates: User[];

  @OneToMany(() => LeaveApplication, (leave) => leave.applicant)
  leaveApplications: LeaveApplication[];

  @OneToMany(() => ExpenseApplication, (expense) => expense.applicant)
  expenseApplications: ExpenseApplication[];

  @OneToMany(() => ApprovalRecord, (record) => record.approver)
  approvalRecords: ApprovalRecord[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}