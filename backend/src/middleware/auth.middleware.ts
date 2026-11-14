import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'VERIFICATION_ADMIN';
  ownerProfileId?: string;
  ownerStatus?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticateJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev';
    const decoded = jwt.verify(token, secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' does not have access to this resource`
      });
    }
    next();
  };
};

export const requireApprovedOwner = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Only owners can access this endpoint' });
  }
  if (req.user.ownerStatus !== 'APPROVED') {
    return res.status(403).json({
      error: `Owner account is ${req.user.ownerStatus || 'PENDING'}. Approved verification is required.`
    });
  }
  next();
};

