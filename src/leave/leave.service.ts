import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaveApplication } from './leave.entity';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ApprovalDto } from './dto/approval.dto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { ApprovalRecord, ApplicationType } from '../approval/approval.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveApplication)
    private leaveRepository: Repository<LeaveApplication>,
    @InjectRepository(ApprovalRecord)
    private approvalRecordRepository: Repository<ApprovalRecord>,
    private usersService: UsersService,
  ) {}

  async create(createLeaveDto: CreateLeaveDto, applicantId: string): Promise<LeaveApplication> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const user = await this.usersService.findOne(applicantId, admin);
    
    const leave = this.leaveRepository.create({
      ...createLeaveDto,
      applicantId,
    });
    const savedLeave = await this.leaveRepository.save(leave);
    
    if (user.managerId) {
      await this.approvalRecordRepository.save({
        applicationId: savedLeave.id,
        applicationType: ApplicationType.LEAVE,
        approverId: user.managerId,
        approverRole: UserRole.MANAGER,
        status: ApplicationStatus.PENDING,
      });
    }
    
    return savedLeave;
  }

  async findAll(userId: string, userRole: string): Promise<LeaveApplication[]> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const currentUser = await this.usersService.findOne(userId, admin);
    
    if (userRole === UserRole.ADMIN || userRole === UserRole.IT) {
      return this.leaveRepository.find({
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    if (userRole === UserRole.HR) {
      return this.leaveRepository.find({
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    if (userRole === UserRole.MANAGER) {
      return this.leaveRepository.find({
        where: { applicant: { department: currentUser.department } },
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    return this.leaveRepository.find({
      where: { applicantId: userId },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
  }

  async findOne(id: string, currentUser?: User): Promise<LeaveApplication> {
    const leave = await this.leaveRepository.findOne({
      where: { id },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
    if (!leave) {
      throw new NotFoundException('Leave application not found');
    }
    
    if (currentUser && !this.canViewLeave(currentUser, leave)) {
      throw new ForbiddenException('You are not authorized to view this application');
    }
    
    return leave;
  }

  async approve(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<LeaveApplication> {
    const leave = await this.findOne(id);
    
    if (leave.status === ApplicationStatus.COMPLETED || leave.status === ApplicationStatus.REJECTED || leave.status === ApplicationStatus.CANCELLED) {
      throw new ForbiddenException('Cannot approve a completed or rejected application');
    }

    const canApprove = await this.canApproveLeave(leave, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to approve this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.LEAVE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.APPROVED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    return this.processLeaveApproval(leave, approverRole as UserRole);
  }

  async reject(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<LeaveApplication> {
    const leave = await this.findOne(id);
    
    if (leave.status === ApplicationStatus.COMPLETED || leave.status === ApplicationStatus.REJECTED || leave.status === ApplicationStatus.CANCELLED) {
      throw new ForbiddenException('Cannot reject a completed or rejected application');
    }

    const canApprove = await this.canApproveLeave(leave, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to reject this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.LEAVE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.REJECTED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    leave.status = ApplicationStatus.REJECTED;
    leave.updatedAt = new Date();
    return this.leaveRepository.save(leave);
  }

  async cancel(id: string, userId: string): Promise<LeaveApplication> {
    const leave = await this.findOne(id);
    
    if (leave.applicantId !== userId) {
      throw new ForbiddenException('Only the applicant can cancel this application');
    }
    
    if (leave.status === ApplicationStatus.COMPLETED || leave.status === ApplicationStatus.REJECTED) {
      throw new ForbiddenException('Cannot cancel a completed or rejected application');
    }

    leave.status = ApplicationStatus.CANCELLED;
    leave.updatedAt = new Date();
    return this.leaveRepository.save(leave);
  }

  private async canApproveLeave(leave: LeaveApplication, approverId: string, approverRole: string): Promise<boolean> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const applicant = await this.usersService.findOne(leave.applicantId, admin);
    const approver = await this.usersService.findOne(approverId, admin);
    
    if (approverRole === UserRole.ADMIN || approverRole === UserRole.IT) {
      return true;
    }
    
    if (approverRole === UserRole.MANAGER) {
      if (applicant.managerId === approverId && applicant.department === approver.department) {
        const managerApprovals = await this.approvalRecordRepository.find({
          where: {
            applicationId: leave.id,
            applicationType: ApplicationType.LEAVE,
            approverRole: UserRole.MANAGER,
            status: ApplicationStatus.APPROVED,
          },
        });
        return managerApprovals.length === 0;
      }
      return false;
    }
    
    if (approverRole === UserRole.HR) {
      const hrApprovals = await this.approvalRecordRepository.find({
        where: {
          applicationId: leave.id,
          applicationType: ApplicationType.LEAVE,
          approverRole: UserRole.HR,
        },
      });
      const managerApproved = await this.approvalRecordRepository.findOne({
        where: {
          applicationId: leave.id,
          applicationType: ApplicationType.LEAVE,
          approverRole: UserRole.MANAGER,
          status: ApplicationStatus.APPROVED,
        },
      });
      return hrApprovals.length === 0 && managerApproved !== null;
    }
    
    return false;
  }

  private canViewLeave(currentUser: User, leave: LeaveApplication): boolean {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT) {
      return true;
    }
    if (currentUser.id === leave.applicantId) {
      return true;
    }
    if (currentUser.role === UserRole.MANAGER) {
      return currentUser.id === leave.applicant.managerId && currentUser.department === leave.applicant.department;
    }
    if (currentUser.role === UserRole.HR) {
      return true;
    }
    return false;
  }

  private async processLeaveApproval(leave: LeaveApplication, approverRole: UserRole): Promise<LeaveApplication> {
    const managerApproved = await this.approvalRecordRepository.findOne({
      where: {
        applicationId: leave.id,
        applicationType: ApplicationType.LEAVE,
        approverRole: UserRole.MANAGER,
        status: ApplicationStatus.APPROVED,
      },
    });
    
    const hrApproved = await this.approvalRecordRepository.findOne({
      where: {
        applicationId: leave.id,
        applicationType: ApplicationType.LEAVE,
        approverRole: UserRole.HR,
        status: ApplicationStatus.APPROVED,
      },
    });

    if (managerApproved && hrApproved) {
      leave.status = ApplicationStatus.COMPLETED;
    } else if (managerApproved) {
      leave.status = ApplicationStatus.APPROVED;
    }

    leave.updatedAt = new Date();
    return this.leaveRepository.save(leave);
  }
}