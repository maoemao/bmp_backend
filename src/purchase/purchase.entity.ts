import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { ApprovalRecord } from '../approval/approval.entity';

export enum PurchaseStatus {
  PENDING = 'PENDING',
  DEPARTMENT_REVIEW = 'DEPARTMENT_REVIEW',
  PURCHASING_REVIEW = 'PURCHASING_REVIEW',
  DIRECTOR_REVIEW = 'DIRECTOR_REVIEW',
  CEO_REVIEW = 'CEO_REVIEW',
  FINANCE_REVIEW = 'FINANCE_REVIEW',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_applications')
export class PurchaseApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_id', nullable: false })
  applicantId: string;

  @ManyToOne(() => User, (user) => user.subordinates)
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  amount: number;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ nullable: true, length: 200 })
  supplier: string;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING,
  })
  status: PurchaseStatus;

  @Column({ name: 'po_number', nullable: true, length: 50 })
  poNumber: string;

  @OneToMany(() => ApprovalRecord, (record) => record.purchaseApplication)
  approvalRecords: ApprovalRecord[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}