import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseApplication, PurchaseStatus } from './purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ApprovalDto } from './dto/approval.dto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { ApprovalRecord, ApplicationType } from '../approval/approval.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';

const LOW_AMOUNT_THRESHOLD = 5000;
const HIGH_AMOUNT_THRESHOLD = 50000;

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(PurchaseApplication)
    private purchaseRepository: Repository<PurchaseApplication>,
    @InjectRepository(ApprovalRecord)
    private approvalRecordRepository: Repository<ApprovalRecord>,
    private usersService: UsersService,
  ) {}

  async create(createPurchaseDto: CreatePurchaseDto, applicantId: string): Promise<PurchaseApplication> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const applicant = await this.usersService.findOne(applicantId, admin);
    
    const purchase = this.purchaseRepository.create({
      ...createPurchaseDto,
      applicantId,
      status: PurchaseStatus.DEPARTMENT_REVIEW,
    });
    
    const savedPurchase = await this.purchaseRepository.save(purchase);
    
    if (applicant.managerId) {
      await this.approvalRecordRepository.save({
        applicationId: savedPurchase.id,
        applicationType: ApplicationType.PURCHASE,
        approverId: applicant.managerId,
        approverRole: UserRole.MANAGER,
        status: ApplicationStatus.PENDING,
      });
    }
    
    return savedPurchase;
  }

  async findAll(userId: string, userRole: string): Promise<PurchaseApplication[]> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const currentUser = await this.usersService.findOne(userId, admin);
    
    if (userRole === UserRole.ADMIN || userRole === UserRole.IT || userRole === UserRole.PURCHASING || userRole === UserRole.DIRECTOR || userRole === UserRole.CEO || userRole === UserRole.FINANCE) {
      return this.purchaseRepository.find({
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    if (userRole === UserRole.MANAGER) {
      return this.purchaseRepository.find({
        where: { applicant: { department: currentUser.department } },
        relations: { applicant: true, approvalRecords: { approver: true } },
      });
    }
    
    return this.purchaseRepository.find({
      where: { applicantId: userId },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
  }

  async findOne(id: string, currentUser?: User): Promise<PurchaseApplication> {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: { applicant: true, approvalRecords: { approver: true } },
    });
    if (!purchase) {
      throw new NotFoundException('Purchase application not found');
    }
    
    if (currentUser && !this.canViewPurchase(currentUser, purchase)) {
      throw new ForbiddenException('You are not authorized to view this application');
    }
    
    return purchase;
  }

  async approve(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<PurchaseApplication> {
    const purchase = await this.findOne(id);
    
    if (purchase.status === PurchaseStatus.COMPLETED || purchase.status === PurchaseStatus.REJECTED || purchase.status === PurchaseStatus.CANCELLED) {
      throw new ForbiddenException('Cannot approve a completed or rejected application');
    }

    const canApprove = await this.canApprovePurchase(purchase, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to approve this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.PURCHASE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.APPROVED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    return this.processPurchaseApproval(purchase, approverRole as UserRole);
  }

  async reject(id: string, approverId: string, approverRole: string, approvalDto: ApprovalDto): Promise<PurchaseApplication> {
    const purchase = await this.findOne(id);
    
    if (purchase.status === PurchaseStatus.COMPLETED || purchase.status === PurchaseStatus.REJECTED || purchase.status === PurchaseStatus.CANCELLED) {
      throw new ForbiddenException('Cannot reject a completed or rejected application');
    }

    const canApprove = await this.canApprovePurchase(purchase, approverId, approverRole);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to reject this application');
    }

    await this.approvalRecordRepository.save({
      applicationId: id,
      applicationType: ApplicationType.PURCHASE,
      approverId,
      approverRole: approverRole as UserRole,
      status: ApplicationStatus.REJECTED,
      comment: approvalDto.comment,
      approvedAt: new Date(),
    });

    purchase.status = PurchaseStatus.REJECTED;
    purchase.updatedAt = new Date();
    return this.purchaseRepository.save(purchase);
  }

  async cancel(id: string, userId: string): Promise<PurchaseApplication> {
    const purchase = await this.findOne(id);
    
    if (purchase.applicantId !== userId) {
      throw new ForbiddenException('Only the applicant can cancel this application');
    }
    
    if (purchase.status === PurchaseStatus.COMPLETED || purchase.status === PurchaseStatus.REJECTED) {
      throw new ForbiddenException('Cannot cancel a completed or rejected application');
    }

    purchase.status = PurchaseStatus.CANCELLED;
    purchase.updatedAt = new Date();
    return this.purchaseRepository.save(purchase);
  }

  private async canApprovePurchase(purchase: PurchaseApplication, approverId: string, approverRole: string): Promise<boolean> {
    const admin = await this.usersService.findOneByEmail('admin@qq.com');
    const applicant = await this.usersService.findOne(purchase.applicantId, admin);
    const approver = await this.usersService.findOne(approverId, admin);
    
    if (approverRole === UserRole.ADMIN || approverRole === UserRole.IT) {
      return true;
    }
    
    if (approverRole === UserRole.MANAGER) {
      if (purchase.status === PurchaseStatus.DEPARTMENT_REVIEW) {
        return applicant.managerId === approverId && applicant.department === approver.department;
      }
      return false;
    }
    
    if (approverRole === UserRole.PURCHASING) {
      return purchase.status === PurchaseStatus.PURCHASING_REVIEW;
    }
    
    if (approverRole === UserRole.DIRECTOR) {
      return purchase.status === PurchaseStatus.DIRECTOR_REVIEW;
    }
    
    if (approverRole === UserRole.CEO) {
      return purchase.status === PurchaseStatus.CEO_REVIEW;
    }
    
    if (approverRole === UserRole.FINANCE) {
      return purchase.status === PurchaseStatus.FINANCE_REVIEW;
    }
    
    return false;
  }

  private canViewPurchase(currentUser: User, purchase: PurchaseApplication): boolean {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT || currentUser.role === UserRole.PURCHASING || currentUser.role === UserRole.DIRECTOR || currentUser.role === UserRole.CEO || currentUser.role === UserRole.FINANCE) {
      return true;
    }
    if (currentUser.id === purchase.applicantId) {
      return true;
    }
    if (currentUser.role === UserRole.MANAGER) {
      return currentUser.id === purchase.applicant.managerId && currentUser.department === purchase.applicant.department;
    }
    return false;
  }

  private async processPurchaseApproval(purchase: PurchaseApplication, approverRole: UserRole): Promise<PurchaseApplication> {
    switch (purchase.status) {
      case PurchaseStatus.DEPARTMENT_REVIEW:
        purchase.status = PurchaseStatus.PURCHASING_REVIEW;
        break;
        
      case PurchaseStatus.PURCHASING_REVIEW:
        if (purchase.amount <= LOW_AMOUNT_THRESHOLD) {
          purchase.status = PurchaseStatus.FINANCE_REVIEW;
        } else {
          purchase.status = PurchaseStatus.DIRECTOR_REVIEW;
        }
        break;
        
      case PurchaseStatus.DIRECTOR_REVIEW:
        if (purchase.amount > HIGH_AMOUNT_THRESHOLD) {
          purchase.status = PurchaseStatus.CEO_REVIEW;
        } else {
          purchase.status = PurchaseStatus.FINANCE_REVIEW;
        }
        break;
        
      case PurchaseStatus.CEO_REVIEW:
        purchase.status = PurchaseStatus.FINANCE_REVIEW;
        break;
        
      case PurchaseStatus.FINANCE_REVIEW:
        purchase.status = PurchaseStatus.COMPLETED;
        purchase.poNumber = this.generatePONumber();
        break;
    }
    
    purchase.updatedAt = new Date();
    return this.purchaseRepository.save(purchase);
  }

  private generatePONumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO${year}${month}${day}${random}`;
  }
}