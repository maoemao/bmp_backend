import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { UsersService } from './users/users.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());
  
  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());
  
  app.enableCors();

  app.use(new LoggingMiddleware().use);
  app.use(new AuthMiddleware().use);

  const config = new DocumentBuilder()
    .setTitle('BMP Backend API')
    .setDescription('全业务审批系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const usersService = app.get(UsersService);
  await usersService.initializeAdmin();
  
  await app.listen(process.env.PORT || 3000);
}
bootstrap();