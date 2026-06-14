import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('config')
@UseGuards(AuthGuard('jwt'))
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }

  @Get('departments')
  getDepartments() {
    return this.configService.getDepartments();
  }

  @Get('roles')
  getRoles() {
    return this.configService.getRoles();
  }
}
