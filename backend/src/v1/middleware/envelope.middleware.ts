import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ApiSuccessResponse, ApiErrorResponse, createMeta } from '../types';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || `req_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  (req as any).requestId = reqId;
  res.setHeader('X-Request-Id', reqId);

  const idemKey = req.headers['idempotency-key'] as string | undefined;
  if (idemKey) {
    (req as any).idempotencyKey = idemKey;
  }
  next();
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, metaOverride?: any): Response {
  const req = res.req as Request;
  const meta = createMeta(metaOverride?.requestId || (req as any)?.requestId);
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: { ...meta, ...metaOverride }
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response {
  const req = res.req as Request;
  const meta = createMeta((req as any)?.requestId);
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    meta
  };
  return res.status(statusCode).json(body);
}

