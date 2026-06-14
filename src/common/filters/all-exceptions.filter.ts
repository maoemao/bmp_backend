import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || message;
    }

    // 打印详细错误日志
    console.error('=== Exception Caught ===');
    console.error('Time:', new Date().toISOString());
    console.error('URL:', request.url);
    console.error('Method:', request.method);
    console.error('Status:', status);
    console.error('Message:', message);
    console.error('Exception:', exception);
    if (exception instanceof Error) {
      console.error('Stack:', exception.stack);
    }
    console.error('========================');

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
