import { Router } from 'express';
import { requestIdMiddleware, sendSuccess } from './middleware/envelope.middleware';
import authIdentityRoutes from './routes/auth_identity.v1';
import kycVerificationRoutes from './routes/kyc_verification.v1';

const v1Router = Router();

// Apply request ID and idempotency tracking across all V1 routes
v1Router.use(requestIdMiddleware);

// Base root status for V1
v1Router.get('/', (req, res) => {
  return sendSuccess(res, {
    version: '1.0.0',
    service: 'hostelizer-api-v1',
    modules: [
      { id: 1, name: 'Authentication & User Profile (Module 1)', status: 'ACTIVE' },
      { id: 2, name: 'Owner KYC & Document Verification', status: 'ACTIVE' }
    ],
    conventions: {
      envelope: '{ success, data, meta: { requestId, timestamp } }',
      timestamps: 'ISO_8601_UTC',
      timezone: 'Asia/Kolkata'
    }
  });
});

// Mount Auth & KYC routes
v1Router.use(authIdentityRoutes);
v1Router.use(kycVerificationRoutes);

export default v1Router;
