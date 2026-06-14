import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const WHITE_LIST = [
  '/auth/login',
  '/auth/register',
  '/api',
  '/api-json',
];

export interface CustomJwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      customUser?: CustomJwtPayload;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { originalUrl } = req;
    
    if (WHITE_LIST.some(path => originalUrl.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as CustomJwtPayload;
      req.customUser = decoded;
      next();
    } catch (error) {
      let errorMessage = 'Invalid token';
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token expired';
      }
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized',
        error: errorMessage,
      });
    }
  }
}