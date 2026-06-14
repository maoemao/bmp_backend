import { Controller, Get, Post, Body, Put, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(@Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.findAll(currentUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.findOne(id, currentUser);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.create(createUserDto, currentUser);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.remove(id, currentUser);
  }

  @Get('subordinates/:managerId')
  async findSubordinates(@Param('managerId') managerId: string, @Request() req) {
    const currentUser = await this.usersService.findOneByEmail(req.user.email);
    return this.usersService.findSubordinates(managerId, currentUser);
  }

  @Get('department/:department')
  async findByDepartment(@Param('department') department: string) {
    return this.usersService.findByDepartment(department);
  }
}