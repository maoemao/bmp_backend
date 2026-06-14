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

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      const timestamp = new Date().toLocaleString('zh-CN');
      
      const blue = (str: string) => `\x1b[34m${str}\x1b[0m`;
      const green = (str: string) => `\x1b[32m${str}\x1b[0m`;
      const red = (str: string) => `\x1b[31m${str}\x1b[0m`;
      const yellow = (str: string) => `\x1b[33m${str}\x1b[0m`;
      
      const statusColor = statusCode >= 500 ? red : statusCode >= 400 ? yellow : green;
      
      console.log(blue('┌─────────────────────────────────────────────────────────────┐'));
      console.log(blue(`│ [${timestamp}] [${method}] ${originalUrl} (${ip})`));
      console.log(blue('├─────────────────────────────────────────────────────────────┤'));
      console.log(green(`│ Params: ${JSON.stringify(params)}`));
      console.log(green(`│ Query: ${JSON.stringify(query)}`));
      console.log(green(`│ Body: ${body || '{}'}`));
      console.log(blue('└─────────────────────────────────────────────────────────────┘'));
      
      console.log(blue('┌─────────────────────────────────────────────────────────────┐'));
      console.log(blue(`│ [${timestamp}] [${statusColor(statusCode.toString())}] ${originalUrl} - ${duration}ms`));
      console.log(blue('└─────────────────────────────────────────────────────────────┘'));
      console.log('');
    });

    next();
  }
}