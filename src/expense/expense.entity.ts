import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { ApprovalRecord } from '../approval/approval.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';

@Entity('expense_applications')
export class ExpenseApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_id', nullable: false })
  applicantId: string;

  @ManyToOne(() => User, (user) => user.expenseApplications)
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ name: 'receipt_url', nullable: true, length: 500 })
  receiptUrl: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @OneToMany(() => ApprovalRecord, (record) => record.expenseApplication)
  approvalRecords: ApprovalRecord[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}