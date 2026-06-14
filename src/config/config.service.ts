import { Injectable } from '@nestjs/common';
import { UserRole, Department } from '../users/user.entity';

export class ConfigDto {
  departments: string[];
  roles: { value: string; label: string }[];
  leaveTypes: { value: string; label: string }[];
  applicationStatuses: { value: string; label: string }[];
}

@Injectable()
export class ConfigService {
  getConfig(): ConfigDto {
    return {
      departments: Object.values(Department),
      roles: Object.values(UserRole).map(role => ({
        value: role,
        label: this.getRoleLabel(role),
      })),
      leaveTypes: [
        { value: 'ANNUAL', label: '年假' },
        { value: 'SICK', label: '病假' },
        { value: 'PERSONAL', label: '事假' },
        { value: 'MARRIAGE', label: '婚假' },
        { value: 'MATERNITY', label: '产假' },
        { value: 'PATERNITY', label: '陪产假' },
        { value: 'FUNERAL', label: '丧假' },
      ],
      applicationStatuses: [
        { value: 'PENDING', label: '待审批' },
        { value: 'IN_PROGRESS', label: '审批中' },
        { value: 'COMPLETED', label: '已完成' },
        { value: 'REJECTED', label: '已拒绝' },
        { value: 'CANCELLED', label: '已取消' },
      ],
    };
  }

  getDepartments(): string[] {
    return Object.values(Department);
  }

  getRoles(): { value: string; label: string }[] {
    return Object.values(UserRole).map(role => ({
      value: role,
      label: this.getRoleLabel(role),
    }));
  }

  private getRoleLabel(role: UserRole): string {
    const roleLabels: Record<UserRole, string> = {
      [UserRole.ADMIN]: '系统管理员',
      [UserRole.IT]: 'IT管理员',
      [UserRole.MANAGER]: '部门经理',
      [UserRole.EMPLOYEE]: '普通员工',
      [UserRole.HR]: '人力资源',
      [UserRole.FINANCE]: '财务',
      [UserRole.DIRECTOR]: '总监',
      [UserRole.PURCHASING]: '采购',
      [UserRole.CEO]: '首席执行官',
    };
    return roleLabels[role] || role;
  }
}
