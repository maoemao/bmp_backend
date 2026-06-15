import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, query, params } = req;
    
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody = '';

    res.send = function(this: Response, data?: any): Response {
      if (data) {
        responseBody = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      }
      return originalSend.call(this, data);
    };

    res.json = function(this: Response, data?: any): Response {
      if (data) {
        responseBody = JSON.stringify(data, null, 2);
      }
      return originalJson.call(this, data);
    };

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      const timestamp = new Date().toLocaleString('zh-CN');
      
      const blue = (str: string) => `\x1b[34m${str}\x1b[0m`;
      const green = (str: string) => `\x1b[32m${str}\x1b[0m`;
      const red = (str: string) => `\x1b[31m${str}\x1b[0m`;
      const yellow = (str: string) => `\x1b[33m${str}\x1b[0m`;
      const cyan = (str: string) => `\x1b[36m${str}\x1b[0m`;
      
      const statusColor = statusCode >= 500 ? red : statusCode >= 400 ? yellow : green;
      
      console.log(blue('┌─────────────────────────────────────────────────────────────┐'));
      console.log(blue(`│ [${timestamp}] [${method}] ${originalUrl} (${ip})`));
      console.log(blue('├─────────────────────────────────────────────────────────────┤'));
      console.log(green(`│ Params: ${JSON.stringify(params)}`));
      console.log(green(`│ Query: ${JSON.stringify(query)}`));
      console.log(green(`│ Body: ${body || '{}'}`));
      console.log(blue('├─────────────────────────────────────────────────────────────┤'));
      console.log(cyan(`│ Response Status: ${statusColor(statusCode.toString())}`));
      console.log(cyan(`│ Response Body: ${responseBody || '{}'}`));
      console.log(blue('├─────────────────────────────────────────────────────────────┤'));
      console.log(blue(`│ Duration: ${duration}ms`));
      console.log(blue('└─────────────────────────────────────────────────────────────┘'));
      console.log('');
    });

    next();
  }
}