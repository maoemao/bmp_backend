import { Injectable, ConflictException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

export const ADMIN_EMAIL = 'admin@qq.com';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string;
  managerId: string;
  manager?: UserResponse;
  needPasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTreeResponse extends UserResponse {
  children?: UserTreeResponse[];
}

export interface UserFilter {
  email?: string;
  name?: string;
  id?: string;
  managerId?: string;
  department?: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private excludePassword(user: User): UserResponse {
    const { password, manager, ...result } = user;
    const response: UserResponse = {
      ...result as UserResponse,
    };
    if (manager) {
      response.manager = this.excludePassword(manager);
    }
    return response;
  }

  private excludePasswordFromList(users: User[]): UserResponse[] {
    return users.map(user => this.excludePassword(user));
  }

  async create(createUserDto: CreateUserDto, currentUser: User): Promise<UserResponse> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    if (!this.canCreateUser(currentUser)) {
      throw new ForbiddenException('You are not authorized to create users');
    }

    const managerId = await this.calculateManagerId(createUserDto.role, createUserDto.department);

    const DEFAULT_PASSWORD = '123456';
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      managerId,
      needPasswordChange: true,
    });
    const savedUser = await this.usersRepository.save(user);
    return this.excludePassword(savedUser);
  }

  private async calculateManagerId(role?: UserRole, department?: string): Promise<string | null> {
    if (!role || !department) {
      return null;
    }

    switch (role) {
      case UserRole.EMPLOYEE:
        return this.findDepartmentManager(department);
      case UserRole.MANAGER:
        return this.findDirector(department);
      case UserRole.HR:
      case UserRole.FINANCE:
      case UserRole.PURCHASING:
      case UserRole.IT:
        return this.findDepartmentManager(department) || this.findDirector(department);
      case UserRole.DIRECTOR:
        return this.findCEO();
      case UserRole.CEO:
      case UserRole.ADMIN:
        return null;
      default:
        return null;
    }
  }

  private async findDepartmentManager(department: string): Promise<string | null> {
    const manager = await this.usersRepository.findOne({
      where: { department, role: UserRole.MANAGER },
    });
    if (manager) {
      return manager.id;
    }
    const director = await this.usersRepository.findOne({
      where: { department, role: UserRole.DIRECTOR },
    });
    return director?.id || null;
  }

  private async findDirector(department: string): Promise<string | null> {
    const director = await this.usersRepository.findOne({
      where: { department, role: UserRole.DIRECTOR },
    });
    if (director) {
      return director.id;
    }
    const anyDirector = await this.usersRepository.findOne({
      where: { role: UserRole.DIRECTOR },
    });
    return anyDirector?.id || null;
  }

  private async findCEO(): Promise<string | null> {
    const ceo = await this.usersRepository.findOne({
      where: { role: UserRole.CEO },
    });
    return ceo?.id || null;
  }

  async findAll(currentUser: User, filter?: UserFilter): Promise<UserResponse[]> {
  const whereConditions: any = {};

  if (filter) {
    if (filter.id) {
      whereConditions.id = filter.id;
    }
    if (filter.email) {
      whereConditions.email = filter.email;
    }
    if (filter.name) {
      whereConditions.name = filter.name;
    }
    if (filter.managerId !== undefined && filter.managerId !== '') {
      whereConditions.managerId = filter.managerId ? filter.managerId : null;
    }
    if (filter.department) {
      whereConditions.department = filter.department;
    }
    if (filter.role) {
      whereConditions.role = filter.role;
    }
  }

  if (!this.canViewAllUsers(currentUser)) {
    whereConditions.id = currentUser.id;
  }

  const users = await this.usersRepository.find({
    where: whereConditions,
    relations: { manager: true },
  });
  return this.excludePasswordFromList(users);
}

  async findOne(id: string, currentUser: User): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { manager: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (!this.canViewUser(currentUser, user)) {
      throw new ForbiddenException('You are not authorized to view this user');
    }
    
    return this.excludePassword(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { manager: true },
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (!this.canUpdateUser(currentUser, user)) {
      throw new ForbiddenException('You are not authorized to update this user');
    }

    if (updateUserDto.managerId !== undefined) {
      user.managerId = updateUserDto.managerId ? updateUserDto.managerId : null;
    }

    if (updateUserDto.email !== undefined) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.department !== undefined) {
      user.department = updateUserDto.department;
    }

    user.updatedAt = new Date();
    const updatedUser = await this.usersRepository.save(user);
    return this.excludePassword(updatedUser);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.canDeleteUser(currentUser, user)) {
      throw new ForbiddenException('You are not authorized to delete this user');
    }

    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string, currentUser: User): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentUser.id !== userId && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not authorized to change this user\'s password');
    }

    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Invalid old password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.needPasswordChange = false;
    user.updatedAt = new Date();
    
    const updatedUser = await this.usersRepository.save(user);
    return this.excludePassword(updatedUser);
  }

  async findSubordinates(managerId: string, currentUser: User): Promise<UserTreeResponse[]> {
    if (!this.canViewSubordinates(currentUser, managerId)) {
      throw new ForbiddenException('You are not authorized to view subordinates');
    }
    const allSubordinates = await this.findSubordinatesRecursively(managerId);
    const subordinatesWithoutPassword = this.excludePasswordFromList(allSubordinates);
    return this.buildTree(subordinatesWithoutPassword, managerId);
  }

  private async findSubordinatesRecursively(managerId: string): Promise<User[]> {
    const directSubordinates = await this.usersRepository.find({ where: { managerId } });
    
    const allSubordinates: User[] = [...directSubordinates];
    
    for (const subordinate of directSubordinates) {
      const nestedSubordinates = await this.findSubordinatesRecursively(subordinate.id);
      allSubordinates.push(...nestedSubordinates);
    }
    
    return allSubordinates;
  }

  private buildTree(users: UserResponse[], managerId: string): UserTreeResponse[] {
    const map = new Map<string, UserTreeResponse>();
    const result: UserTreeResponse[] = [];
    
    users.forEach(user => {
      map.set(user.id, { ...user, children: [] });
    });
    
    users.forEach(user => {
      const treeNode = map.get(user.id)!;
      if (user.managerId === managerId) {
        result.push(treeNode);
      } else {
        const parent = map.get(user.managerId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(treeNode);
        }
      }
    });
    
    return result;
  }

  async findByRole(role: UserRole): Promise<UserResponse[]> {
    const users = await this.usersRepository.find({ where: { role } });
    return this.excludePasswordFromList(users);
  }

  async findByDepartment(department: string): Promise<UserResponse[]> {
    const users = await this.usersRepository.find({ where: { department } });
    return this.excludePasswordFromList(users);
  }

  async initializeAdmin(): Promise<User> {
    const existingAdmin = await this.findOneByEmail(ADMIN_EMAIL);
    if (existingAdmin) {
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = this.usersRepository.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: '系统管理员',
      role: UserRole.ADMIN,
      department: 'IT部门',
    });
    return this.usersRepository.save(admin);
  }

  private canCreateUser(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.IT;
  }

  private canViewAllUsers(user: User): boolean {
    return user.role === UserRole.ADMIN || user.role === UserRole.IT || user.role === UserRole.HR || user.role === UserRole.MANAGER;
  }

  private canViewUser(currentUser: User, targetUser: User): boolean {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT) {
      return true;
    }
    if (currentUser.id === targetUser.id) {
      return true;
    }
    if (currentUser.role === UserRole.MANAGER && currentUser.id === targetUser.managerId) {
      return true;
    }
    return false;
  }

  private canUpdateUser(currentUser: User, targetUser: User): boolean {
    if (targetUser.email === ADMIN_EMAIL) {
      return false;
    }
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }
    if (currentUser.role === UserRole.IT) {
      return true;
    }
    if (currentUser.id === targetUser.id) {
      return true;
    }
    return false;
  }

  private canDeleteUser(currentUser: User, targetUser: User): boolean {
    if (targetUser.email === ADMIN_EMAIL) {
      return false;
    }
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT;
  }

  private canViewSubordinates(currentUser: User, managerId: string): boolean {
    const adminRoles = [UserRole.ADMIN, UserRole.CEO, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HR, UserRole.FINANCE, UserRole.PURCHASING, UserRole.IT];
    return adminRoles.includes(currentUser.role) || currentUser.id === managerId;
  }
}