import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../store/memoryStore';
import { sendError } from './envelope.middleware';
import { V1User } from '../types';

export function getReqUser(req: Request): V1User {
  return (req as any).user || {
    id: 'usr_01jcb001',
    email: 'user@example.com',
    role: 'OWNER',
    fullName: 'Rajesh Sharma',
    phoneNumber: '+919876543210',
    organisationId: 'org_01jca891'
  };
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'AUTH_TOKEN_INVALID', 'Authorization Bearer token missing or malformed', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev';
    const decoded = jwt.verify(token, secret) as any;
    (req as any).user = {
      id: decoded.id || decoded.userId || 'usr_01jcb001',
      email: decoded.email || 'user@example.com',
      role: decoded.role || 'OWNER',
      fullName: decoded.name || decoded.fullName || 'Authorized User',
      phoneNumber: decoded.phoneNumber || decoded.phone || '+919876543210',
      organisationId: decoded.organisationId || 'org_01jca891'
    };
    next();
  } catch (err) {
    return sendError(res, 'AUTH_TOKEN_INVALID', 'Invalid or expired token', 401);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as V1User | undefined;
  if (!user) {
    return sendError(res, 'AUTH_TOKEN_INVALID', 'Authentication required', 401);
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return sendError(res, 'PERMISSION_DENIED', 'Super Admin privilege required', 403);
  }
  next();
}
