import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseApplication } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ApprovalDto } from './dto/approval.dto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { ApprovalRecord, ApplicationType } from '../approval/approval.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';

const HIGH_AMOUNT_THRESHOLD = 1000;

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(ExpenseApplication)
    private expenseRepository: Repository<ExpenseApplication>,
    @InjectRepository(ApprovalRecord)
    private approvalRecordRepository: Repository<ApprovalRecord>,
    private usersService: UsersService,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, applicantId: string): Promise<ExpenseApplication> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const applicant = await this.usersService.findOne(applicantId, admin);
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      applicantId,
    });
    const savedExpense = await this.expenseRepository.save(expense);
    
    if (applicant.managerId) {
      await this.approvalRecordRepository.save({
        applicationId: savedExpense.id,
        applicationType: ApplicationType.EXPENSE,
        approverId: applicant.managerId,
        approverRole: UserRole.MANAGER,
        status: ApplicationStatus.PENDING,
      });
    }
    
    return savedExpense;
  }

  async findAll(userId: string, userRole: string): Promise<ExpenseApplication[]> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const currentUser = await this.usersService.findOne(userId, admin);
    
    if (userRole === UserRole.ADMIN || userRole === UserRole.IT) {
      return this.expenseRepository.find({
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    if (userRole === UserRole.FINANCE || userRole === UserRole.DIRECTOR) {
      return this.expenseRepository.find({
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    if (userRole === UserRole.MANAGER) {
      return this.expenseRepository.find({
        where: { applicant: { department: currentUser.department } },
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    return this.expenseRepository.find({
      where: { applicantId: userId },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
  }

  async findOne(id: string, currentUser?: User): Promise<ExpenseApplication> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
    if (!expense) {
      throw new NotFoundException('Expense application not found');
    }
    
    if (currentUser && !this.canViewExpense(currentUser, expense)) {
      throw new ForbiddenException('You are not authorized to view this application');
    }
    
    return expense;
  }

  async approve(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<ExpenseApplication> {
    const expense = await this.findOne(id);
    
    if (expense.status === ApplicationStatus.COMPLETED || expense.status === ApplicationStatus.REJECTED || expense.status === ApplicationStatus.CANCELLED) {
      throw new ForbiddenException('Cannot approve a completed or rejected application');
    }

    const canApprove = await this.canApproveExpense(expense, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to approve this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.EXPENSE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.APPROVED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    return this.processExpenseApproval(expense, approverRole as UserRole);
  }

  async reject(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<ExpenseApplication> {
    const expense = await this.findOne(id);
    
    if (expense.status === ApplicationStatus.COMPLETED || expense.status === ApplicationStatus.REJECTED || expense.status === ApplicationStatus.CANCELLED) {
      throw new ForbiddenException('Cannot reject a completed or rejected application');
    }

    const canApprove = await this.canApproveExpense(expense, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to reject this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.EXPENSE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.REJECTED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    expense.status = ApplicationStatus.REJECTED;
    expense.updatedAt = new Date();
    return this.expenseRepository.save(expense);
  }

  async cancel(id: string, userId: string): Promise<ExpenseApplication> {
    const expense = await this.findOne(id);
    
    if (expense.applicantId !== userId) {
      throw new ForbiddenException('Only the applicant can cancel this application');
    }
    
    if (expense.status === ApplicationStatus.COMPLETED || expense.status === ApplicationStatus.REJECTED) {
      throw new ForbiddenException('Cannot cancel a completed or rejected application');
    }

    expense.status = ApplicationStatus.CANCELLED;
    expense.updatedAt = new Date();
    return this.expenseRepository.save(expense);
  }

  private async canApproveExpense(expense: ExpenseApplication, approverId: string, approverRole: string): Promise<boolean> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const applicant = await this.usersService.findOne(expense.applicantId, admin);
    const approver = await this.usersService.findOne(approverId, admin);
    
    if (approverRole === UserRole.ADMIN || approverRole === UserRole.IT) {
      return true;
    }
    
    if (approverRole === UserRole.MANAGER) {
      if (applicant.managerId === approverId && applicant.department === approver.department) {
        const managerApprovals = await this.approvalRecordRepository.find({
          where: {
            applicationId: expense.id,
            applicationType: ApplicationType.EXPENSE,
            approverRole: UserRole.MANAGER,
            status: ApplicationStatus.APPROVED,
          },
        });
        return managerApprovals.length === 0;
      }
      return false;
    }
    
    if (approverRole === UserRole.DIRECTOR) {
      const directorApprovals = await this.approvalRecordRepository.find({
        where: {
          applicationId: expense.id,
          applicationType: ApplicationType.EXPENSE,
          approverRole: UserRole.DIRECTOR,
        },
      });
      const managerApproved = await this.approvalRecordRepository.findOne({
        where: {
          applicationId: expense.id,
          applicationType: ApplicationType.EXPENSE,
          approverRole: UserRole.MANAGER,
          status: ApplicationStatus.APPROVED,
        },
      });
      return directorApprovals.length === 0 && managerApproved !== null && expense.amount > HIGH_AMOUNT_THRESHOLD;
    }
    
    if (approverRole === UserRole.FINANCE) {
      const financeApprovals = await this.approvalRecordRepository.find({
        where: {
          applicationId: expense.id,
          applicationType: ApplicationType.EXPENSE,
          approverRole: UserRole.FINANCE,
        },
      });
      
      const managerApproved = await this.approvalRecordRepository.findOne({
        where: {
          applicationId: expense.id,
          applicationType: ApplicationType.EXPENSE,
          approverRole: UserRole.MANAGER,
          status: ApplicationStatus.APPROVED,
        },
      });
      
      if (expense.amount > HIGH_AMOUNT_THRESHOLD) {
        const directorApproved = await this.approvalRecordRepository.findOne({
          where: {
            applicationId: expense.id,
            applicationType: ApplicationType.EXPENSE,
            approverRole: UserRole.DIRECTOR,
            status: ApplicationStatus.APPROVED,
          },
        });
        return financeApprovals.length === 0 && managerApproved !== null && directorApproved !== null;
      }
      
      return financeApprovals.length === 0 && managerApproved !== null;
    }
    
    return false;
  }

  private canViewExpense(currentUser: User, expense: ExpenseApplication): boolean {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT) {
      return true;
    }
    if (currentUser.id === expense.applicantId) {
      return true;
    }
    if (currentUser.role === UserRole.MANAGER) {
      return currentUser.id === expense.applicant.managerId && currentUser.department === expense.applicant.department;
    }
    if (currentUser.role === UserRole.FINANCE || currentUser.role === UserRole.DIRECTOR) {
      return true;
    }
    return false;
  }

  private async processExpenseApproval(expense: ExpenseApplication, approverRole: UserRole): Promise<ExpenseApplication> {
    const managerApproved = await this.approvalRecordRepository.findOne({
      where: {
        applicationId: expense.id,
        applicationType: ApplicationType.EXPENSE,
        approverRole: UserRole.MANAGER,
        status: ApplicationStatus.APPROVED,
      },
    });
    
    const directorApproved = await this.approvalRecordRepository.findOne({
      where: {
        applicationId: expense.id,
        applicationType: ApplicationType.EXPENSE,
        approverRole: UserRole.DIRECTOR,
        status: ApplicationStatus.APPROVED,
      },
    });
    
    const financeApproved = await this.approvalRecordRepository.findOne({
      where: {
        applicationId: expense.id,
        applicationType: ApplicationType.EXPENSE,
        approverRole: UserRole.FINANCE,
        status: ApplicationStatus.APPROVED,
      },
    });

    if (financeApproved) {
      expense.status = ApplicationStatus.COMPLETED;
    } else if (directorApproved && expense.amount > HIGH_AMOUNT_THRESHOLD) {
      expense.status = ApplicationStatus.APPROVED;
    } else if (managerApproved && expense.amount <= HIGH_AMOUNT_THRESHOLD) {
      expense.status = ApplicationStatus.APPROVED;
    } else if (managerApproved) {
      expense.status = ApplicationStatus.APPROVED;
    }

    expense.updatedAt = new Date();
    return this.expenseRepository.save(expense);
  }
}