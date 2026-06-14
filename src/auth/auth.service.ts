import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, ADMIN_EMAIL, UserResponse } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
    };
  }

  async register(createUserDto: CreateUserDto): Promise<UserResponse> {
    const adminUser = await this.usersService.findOneByEmail(ADMIN_EMAIL);
    if (!adminUser) {
      await this.usersService.initializeAdmin();
    }
    const admin = await this.usersService.findOneByEmail(ADMIN_EMAIL);
    return this.usersService.create(createUserDto, admin);
  }
}