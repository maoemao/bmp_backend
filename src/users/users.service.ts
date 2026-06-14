import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
  createdAt: Date;
  updatedAt: Date;
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

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);
    return this.excludePassword(savedUser);
  }

  async findAll(currentUser: User): Promise<UserResponse[]> {
    if (!this.canViewAllUsers(currentUser)) {
      const users = await this.usersRepository.find({
        where: { id: currentUser.id },
        relations: { manager: true },
      });
      return this.excludePasswordFromList(users);
    }
    const users = await this.usersRepository.find({ 
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

    Object.assign(user, updateUserDto);
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

  async findSubordinates(managerId: string, currentUser: User): Promise<UserResponse[]> {
    if (!this.canViewSubordinates(currentUser, managerId)) {
      throw new ForbiddenException('You are not authorized to view subordinates');
    }
    const users = await this.usersRepository.find({ where: { managerId } });
    return this.excludePasswordFromList(users);
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
    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.IT || currentUser.id === managerId;
  }
}