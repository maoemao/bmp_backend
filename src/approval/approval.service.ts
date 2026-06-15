import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { ApprovalRecord, ApplicationType } from './approval.entity';
import { User, UserRole } from '../users/user.entity';
import { LeaveApplication } from '../leave/leave.entity';
import { ExpenseApplication } from '../expense/expense.entity';
import { PurchaseApplication, PurchaseStatus } from '../purchase/purchase.entity';
import { QueryApprovalDto, ApprovalStatusFilter } from './dto/query-approval.dto';
import { ApplicationStatus } from '../common/enums/application-status.enum';

@Injectable()
export class ApprovalService {
  constructor(
    @InjectRepository(ApprovalRecord)
    private approvalRecordRepository: Repository<ApprovalRecord>,
    @InjectRepository(LeaveApplication)
    private leaveRepository: Repository<LeaveApplication>,
    @InjectRepository(ExpenseApplication)
    private expenseRepository: Repository<ExpenseApplication>,
    @InjectRepository(PurchaseApplication)
    private purchaseRepository: Repository<PurchaseApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(userId: string, userRole: string, query: QueryApprovalDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const results: any[] = [];
    const types = query.type ? [query.type] : [ApplicationType.LEAVE, ApplicationType.EXPENSE, ApplicationType.PURCHASE];

    for (const type of types) {
      const applications = await this.getApplicationsByType(type, userId, userRole, user, query);
      results.push(...applications.map(app => ({
        ...app,
        type,
      })));
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      data: results,
      total: results.length,
    };
  }

  private async getApplicationsByType(
    type: ApplicationType,
    userId: string,
    userRole: string,
    user: User,
    query: QueryApprovalDto,
  ) {
    let applications: any[] = [];
    let whereCondition: any = {};

    if (query.status) {
      whereCondition.status = this.mapStatusFilter(query.status, type);
    }

    if (query.userId) {
      whereCondition.applicantId = query.userId;
    }

    if (query.startDate && query.endDate) {
      whereCondition.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    const canViewAll = this.canViewAllApplications(userRole);

    switch (type) {
      case ApplicationType.LEAVE:
        if (!canViewAll) {
          const relatedIds = await this.getRelatedApplicationIds(userId, ApplicationType.LEAVE);
          if (userRole === UserRole.MANAGER) {
            const deptApplicants = await this.userRepository.find({
              where: { department: user.department },
              select: { id: true },
            });
            const deptIds = deptApplicants.map(u => u.id);
            whereCondition.applicantId = In([...relatedIds, ...deptIds]);
          } else {
            whereCondition.applicantId = In([...relatedIds, userId]);
          }
        }
        applications = await this.leaveRepository.find({
          where: whereCondition,
          relations: { applicant: true },
          order: { createdAt: 'DESC' },
        });
        applications = applications.map(app => ({
          id: app.id,
          status: app.status,
          applicant: app.applicant,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          summary: `请假：${app.startDate} 至 ${app.endDate}`,
          description: app.reason,
          currentNode: this.getLeaveCurrentNode(app.status),
        }));
        break;

      case ApplicationType.EXPENSE:
        if (!canViewAll) {
          const relatedIds = await this.getRelatedApplicationIds(userId, ApplicationType.EXPENSE);
          if (userRole === UserRole.MANAGER) {
            const deptApplicants = await this.userRepository.find({
              where: { department: user.department },
              select: { id: true },
            });
            const deptIds = deptApplicants.map(u => u.id);
            whereCondition.applicantId = In([...relatedIds, ...deptIds]);
          } else {
            whereCondition.applicantId = In([...relatedIds, userId]);
          }
        }
        applications = await this.expenseRepository.find({
          where: whereCondition,
          relations: { applicant: true },
          order: { createdAt: 'DESC' },
        });
        applications = applications.map(app => ({
          id: app.id,
          status: app.status,
          applicant: app.applicant,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          summary: `报销：${app.amount}元`,
          description: app.description,
          currentNode: this.getExpenseCurrentNode(app.status, app.amount),
        }));
        break;

      case ApplicationType.PURCHASE:
        if (!canViewAll) {
          const relatedIds = await this.getRelatedApplicationIds(userId, ApplicationType.PURCHASE);
          if (userRole === UserRole.MANAGER) {
            const deptApplicants = await this.userRepository.find({
              where: { department: user.department },
              select: { id: true },
            });
            const deptIds = deptApplicants.map(u => u.id);
            whereCondition.applicantId = In([...relatedIds, ...deptIds]);
          } else {
            whereCondition.applicantId = In([...relatedIds, userId]);
          }
        }
        applications = await this.purchaseRepository.find({
          where: whereCondition,
          relations: { applicant: true },
          order: { createdAt: 'DESC' },
        });
        applications = applications.map(app => ({
          id: app.id,
          status: app.status,
          applicant: app.applicant,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          summary: `采购：${app.amount}元 - ${app.description || ''}`,
          description: app.description,
          currentNode: this.getPurchaseCurrentNode(app.status),
        }));
        break;
    }

    return applications;
  }

  async findOne(type: ApplicationType, id: string, currentUserId: string, currentUserRole: string) {
    let application: any;
    let approvalRecords: ApprovalRecord[];

    switch (type) {
      case ApplicationType.LEAVE:
        application = await this.leaveRepository.findOne({
          where: { id },
          relations: { applicant: true },
        });
        if (!application) {
          throw new NotFoundException('Leave application not found');
        }
        break;

      case ApplicationType.EXPENSE:
        application = await this.expenseRepository.findOne({
          where: { id },
          relations: { applicant: true },
        });
        if (!application) {
          throw new NotFoundException('Expense application not found');
        }
        break;

      case ApplicationType.PURCHASE:
        application = await this.purchaseRepository.findOne({
          where: { id },
          relations: { applicant: true },
        });
        if (!application) {
          throw new NotFoundException('Purchase application not found');
        }
        break;
    }

    approvalRecords = await this.approvalRecordRepository.find({
      where: { applicationId: id, applicationType: type },
      relations: { approver: true },
      order: { approvedAt: 'ASC' },
    });

    const approvalNodes = await this.buildApprovalNodes(type, application, approvalRecords);
    const currentNode = this.getCurrentNode(type, application);
    const currentApprovers = await this.getCurrentApprovers(type, application);
    const availableActions = await this.getAvailableActions(type, application, currentUserId, currentUserRole);
    const historyRecords = this.buildHistoryRecords(application, approvalRecords);

    return {
      application: {
        id: application.id,
        type,
        status: application.status,
        applicant: application.applicant,
        description: type === ApplicationType.LEAVE ? application.reason : application.description,
        content: this.getApplicationContent(type, application),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      approvalNodes,
      currentNode,
      currentApprovers,
      availableActions,
      historyRecords,
    };
  }

  async findById(id: string, currentUserId: string, currentUserRole: string) {
    let application: any;
    let applicationType: ApplicationType;

    application = await this.leaveRepository.findOne({
      where: { id },
      relations: { applicant: true },
    });
    if (application) {
      applicationType = ApplicationType.LEAVE;
    }

    if (!application) {
      application = await this.expenseRepository.findOne({
        where: { id },
        relations: { applicant: true },
      });
      if (application) {
        applicationType = ApplicationType.EXPENSE;
      }
    }

    if (!application) {
      application = await this.purchaseRepository.findOne({
        where: { id },
        relations: { applicant: true },
      });
      if (application) {
        applicationType = ApplicationType.PURCHASE;
      }
    }

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const approvalRecords = await this.approvalRecordRepository.find({
      where: { applicationId: id, applicationType },
      relations: { approver: true },
      order: { approvedAt: 'ASC' },
    });

    const approvalNodes = await this.buildApprovalNodes(applicationType, application, approvalRecords);
    const currentNode = this.getCurrentNode(applicationType, application);
    const currentApprovers = await this.getCurrentApprovers(applicationType, application);
    const availableActions = await this.getAvailableActions(applicationType, application, currentUserId, currentUserRole);
    const historyRecords = this.buildHistoryRecords(application, approvalRecords);

    return {
      application: {
        id: application.id,
        type: applicationType,
        status: application.status,
        applicant: application.applicant,
        description: applicationType === ApplicationType.LEAVE ? application.reason : application.description,
        content: this.getApplicationContent(applicationType, application),
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      approvalNodes,
      currentNode,
      currentApprovers,
      availableActions,
      historyRecords,
    };
  }

  private canViewAllApplications(userRole: string): boolean {
    return [UserRole.ADMIN, UserRole.IT, UserRole.HR, UserRole.FINANCE, UserRole.DIRECTOR, UserRole.CEO, UserRole.PURCHASING].includes(userRole as UserRole);
  }

  private async getRelatedApplicationIds(userId: string, type: ApplicationType): Promise<string[]> {
    const records = await this.approvalRecordRepository.find({
      where: { approverId: userId, applicationType: type },
      select: { applicationId: true },
    });
    return records.map(r => r.applicationId);
  }

  private mapStatusFilter(status: ApprovalStatusFilter, type: ApplicationType): any {
    if (type === ApplicationType.PURCHASE) {
      switch (status) {
        case ApprovalStatusFilter.COMPLETED:
          return PurchaseStatus.COMPLETED;
        case ApprovalStatusFilter.PENDING:
          return In([
            PurchaseStatus.PENDING,
            PurchaseStatus.DEPARTMENT_REVIEW,
            PurchaseStatus.PURCHASING_REVIEW,
            PurchaseStatus.DIRECTOR_REVIEW,
            PurchaseStatus.CEO_REVIEW,
            PurchaseStatus.FINANCE_REVIEW,
          ]);
        case ApprovalStatusFilter.REJECTED:
          return PurchaseStatus.REJECTED;
        case ApprovalStatusFilter.CANCELLED:
          return PurchaseStatus.CANCELLED;
        case ApprovalStatusFilter.IN_PROGRESS:
          return In([
            PurchaseStatus.DEPARTMENT_REVIEW,
            PurchaseStatus.PURCHASING_REVIEW,
            PurchaseStatus.DIRECTOR_REVIEW,
            PurchaseStatus.CEO_REVIEW,
            PurchaseStatus.FINANCE_REVIEW,
          ]);
      }
    }
    return status;
  }

  private getLeaveCurrentNode(status: ApplicationStatus): string {
    switch (status) {
      case ApplicationStatus.PENDING:
        return '部门主管审批';
      case ApplicationStatus.APPROVED:
        return 'HR审批';
      case ApplicationStatus.COMPLETED:
        return '已完成';
      case ApplicationStatus.REJECTED:
        return '已拒绝';
      case ApplicationStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  }

  private getExpenseCurrentNode(status: ApplicationStatus, amount: number): string {
    switch (status) {
      case ApplicationStatus.PENDING:
        return '部门主管审批';
      case ApplicationStatus.APPROVED:
        if (amount > 1000) {
          return '总监审批';
        }
        return '财务审批';
      case ApplicationStatus.COMPLETED:
        return '已完成';
      case ApplicationStatus.REJECTED:
        return '已拒绝';
      case ApplicationStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  }

  private getPurchaseCurrentNode(status: PurchaseStatus): string {
    switch (status) {
      case PurchaseStatus.PENDING:
      case PurchaseStatus.DEPARTMENT_REVIEW:
        return '部门主管审批';
      case PurchaseStatus.PURCHASING_REVIEW:
        return '采购部门复核';
      case PurchaseStatus.DIRECTOR_REVIEW:
        return '总监审批';
      case PurchaseStatus.CEO_REVIEW:
        return 'CEO审批';
      case PurchaseStatus.FINANCE_REVIEW:
        return '财务审核';
      case PurchaseStatus.COMPLETED:
        return '已完成';
      case PurchaseStatus.REJECTED:
        return '已拒绝';
      case PurchaseStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  }

  private async buildApprovalNodes(type: ApplicationType, application: any, records: ApprovalRecord[]): Promise<any[]> {
    const nodes: any[] = [];
    const nodeConfigs = this.getNodeConfigs(type, application);

    for (const config of nodeConfigs) {
      const record = records.find(r => r.approverRole === config.role);
      const approver = record?.approver ? {
        email: record.approver.email,
        name: record.approver.name,
        role: record.approver.role,
        department: record.approver.department,
        managerId: record.approver.managerId,
      } : null;
      nodes.push({
        nodeName: config.name,
        nodeRole: config.role,
        status: record?.status || ApplicationStatus.PENDING,
        approver,
        comment: record?.comment || null,
        approvedAt: record?.approvedAt || null,
      });
    }

    return nodes;
  }

  private getNodeConfigs(type: ApplicationType, application: any): { name: string; role: UserRole }[] {
    switch (type) {
      case ApplicationType.LEAVE:
        return [
          { name: '部门主管审批', role: UserRole.MANAGER },
          { name: 'HR审批', role: UserRole.HR },
        ];
      case ApplicationType.EXPENSE:
        const nodes = [
          { name: '部门主管审批', role: UserRole.MANAGER },
        ];
        if (application.amount > 1000) {
          nodes.push({ name: '总监审批', role: UserRole.DIRECTOR });
        }
        nodes.push({ name: '财务审批', role: UserRole.FINANCE });
        return nodes;
      case ApplicationType.PURCHASE:
        const purchaseNodes = [
          { name: '部门主管审批', role: UserRole.MANAGER },
          { name: '采购部门复核', role: UserRole.PURCHASING },
        ];
        if (application.amount > 5000) {
          purchaseNodes.push({ name: '总监审批', role: UserRole.DIRECTOR });
        }
        if (application.amount > 50000) {
          purchaseNodes.push({ name: 'CEO审批', role: UserRole.CEO });
        }
        purchaseNodes.push({ name: '财务审核', role: UserRole.FINANCE });
        return purchaseNodes;
      default:
        return [];
    }
  }

  private getCurrentNode(type: ApplicationType, application: any): any {
    const status = application.status;
    let nodeName = '';
    let nodeRole = '';

    switch (type) {
      case ApplicationType.LEAVE:
        if (status === ApplicationStatus.PENDING) {
          nodeName = '部门主管审批';
          nodeRole = UserRole.MANAGER;
        } else if (status === ApplicationStatus.APPROVED) {
          nodeName = 'HR审批';
          nodeRole = UserRole.HR;
        }
        break;
      case ApplicationType.EXPENSE:
        if (status === ApplicationStatus.PENDING) {
          nodeName = '部门主管审批';
          nodeRole = UserRole.MANAGER;
        } else if (status === ApplicationStatus.APPROVED) {
          if (application.amount > 1000) {
            nodeName = '总监审批';
            nodeRole = UserRole.DIRECTOR;
          } else {
            nodeName = '财务审批';
            nodeRole = UserRole.FINANCE;
          }
        }
        break;
      case ApplicationType.PURCHASE:
        nodeName = this.getPurchaseCurrentNode(status);
        nodeRole = this.getPurchaseNodeRole(status);
        break;
    }

    return nodeName ? { nodeName, nodeRole } : null;
  }

  private getPurchaseNodeRole(status: PurchaseStatus): string {
    switch (status) {
      case PurchaseStatus.DEPARTMENT_REVIEW:
        return UserRole.MANAGER;
      case PurchaseStatus.PURCHASING_REVIEW:
        return UserRole.PURCHASING;
      case PurchaseStatus.DIRECTOR_REVIEW:
        return UserRole.DIRECTOR;
      case PurchaseStatus.CEO_REVIEW:
        return UserRole.CEO;
      case PurchaseStatus.FINANCE_REVIEW:
        return UserRole.FINANCE;
      default:
        return '';
    }
  }

  private async getCurrentApprovers(type: ApplicationType, application: any): Promise<any[]> {
    const currentNode = this.getCurrentNode(type, application);
    if (!currentNode) return [];

    const approvers = await this.userRepository.find({
      where: { role: currentNode.nodeRole as UserRole },
    });

    return approvers.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
    }));
  }

  private async getAvailableActions(type: ApplicationType, application: any, userId: string, userRole: string): Promise<string[]> {
    const actions: string[] = [];

    if (application.status === ApplicationStatus.COMPLETED || 
        application.status === ApplicationStatus.REJECTED || 
        application.status === ApplicationStatus.CANCELLED) {
      return ['VIEW'];
    }

    if (application.applicantId === userId) {
      actions.push('CANCEL');
    }

    if (userRole === UserRole.ADMIN || userRole === UserRole.IT) {
      actions.push('APPROVE', 'REJECT', 'COMMENT');
      return actions;
    }

    const currentNode = this.getCurrentNode(type, application);
    if (currentNode && userRole === currentNode.nodeRole) {
      actions.push('APPROVE', 'REJECT', 'COMMENT');
    }

    return actions.length > 0 ? actions : ['VIEW'];
  }

  private buildHistoryRecords(application: any, records: ApprovalRecord[]): any[] {
    const history: any[] = [
      {
        action: 'CREATE',
        operator: application.applicant,
        comment: null,
        operatedAt: application.createdAt,
      },
    ];

    for (const record of records) {
      if (record.status === ApplicationStatus.APPROVED) {
        history.push({
          action: 'APPROVE',
          operator: record.approver,
          comment: record.comment,
          operatedAt: record.approvedAt,
        });
      } else if (record.status === ApplicationStatus.REJECTED) {
        history.push({
          action: 'REJECT',
          operator: record.approver,
          comment: record.comment,
          operatedAt: record.approvedAt,
        });
      }
    }

    return history;
  }

  private getApplicationContent(type: ApplicationType, application: any): any {
    switch (type) {
      case ApplicationType.LEAVE:
        return {
          startDate: application.startDate,
          endDate: application.endDate,
          reason: application.reason,
        };
      case ApplicationType.EXPENSE:
        return {
          amount: application.amount,
          description: application.description,
          receiptUrl: application.receiptUrl,
        };
      case ApplicationType.PURCHASE:
        return {
          amount: application.amount,
          description: application.description,
          supplier: application.supplier,
          poNumber: application.poNumber,
        };
      default:
        return {};
    }
  }
}