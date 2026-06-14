import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { ApprovalRecord } from '../approval/approval.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';

@Entity('leave_applications')
export class LeaveApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applicant_id', nullable: false })
  applicantId: string;

  @ManyToOne(() => User, (user) => user.leaveApplications)
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: Date;

  @Column({ nullable: true, length: 500 })
  reason: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @OneToMany(() => ApprovalRecord, (record) => record.leaveApplication)
  approvalRecords: ApprovalRecord[];

  @Column({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}