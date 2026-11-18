import { randomUUID } from 'crypto';

export interface ApiResponseMeta {
  requestId: string;
  timestamp: string; // ISO 8601 UTC
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorDetail {
  field?: string;
  issue?: string;
  code?: string;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, any>;
  };
  meta: ApiResponseMeta;
}

export interface V1User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'VERIFICATION_ADMIN' | 'SUPER_ADMIN';
  fullName?: string;
  phoneNumber?: string;
  status?: string;
  organisationId?: string;
}

export function createMeta(requestId?: string): ApiResponseMeta {
  return {
    requestId: requestId || `req_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    timestamp: new Date().toISOString()
  };
}
