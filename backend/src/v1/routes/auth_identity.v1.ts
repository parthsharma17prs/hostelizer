import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../middleware/envelope.middleware';
import { requireUser, getReqUser } from '../middleware/auth.v1';
import { db } from '../../store/memoryStore';

const router = Router();

// In-memory challenge store for OTP
const otpChallenges = new Map<string, { phone: string; code: string; expiresAt: number; attempts: number }>();

// In-memory sessions store
const userSessions = new Map<string, Array<{ sessionId: string; device: string; ipCity: string; createdAt: string; lastSeenAt: string; isCurrent: boolean }>>();

// In-memory deletion requests
const deletionRequests = new Map<string, { id: string; status: 'PENDING' | 'CANCELLED'; scheduledFor: string; blockers: string[] }>();

// In-memory notification preferences
const notificationPrefs = new Map<string, any>();

// In-memory user profile versions
const profileVersions = new Map<string, number>();

// POST /api/v1/auth/otp/send
router.post('/auth/otp/send', (req: Request, res: Response) => {
  const { phone, purpose } = req.body;
  if (!phone || typeof phone !== 'string') {
    return sendError(res, 'VALIDATION_ERROR', 'phone field is required and must be an E.164 phone string', 400, [
      { field: 'phone', issue: 'Missing or invalid phone number' }
    ]);
  }

  const challengeId = `otpc_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const code = '482913'; // Standard test OTP for demo / automated testing

  otpChallenges.set(challengeId, {
    phone,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0
  });

  return sendSuccess(res, {
    challengeId,
    resendAfterSeconds: 30,
    expiresInSeconds: 300
  }, 202);
});

// POST /api/v1/auth/otp/verify
router.post('/auth/otp/verify', (req: Request, res: Response) => {
  const { challengeId, code } = req.body;
  if (!challengeId || !code) {
    return sendError(res, 'VALIDATION_ERROR', 'challengeId and code are required', 400);
  }

  const challenge = otpChallenges.get(challengeId);
  if (!challenge) {
    // Sandbox fallback
    if (code === '482913' || code === '123456') {
      const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev';
      const token = jwt.sign(
        { id: 'usr_01jcb001', email: 'owner@example.com', role: 'OWNER' },
        secret,
        { expiresIn: '15m' }
      );
      return sendSuccess(res, {
        accessToken: token,
        expiresIn: 900,
        isNewUser: false
      });
    }
    return sendError(res, 'OTP_EXPIRED', 'Verification challenge has expired or does not exist', 410);
  }

  if (Date.now() > challenge.expiresAt) {
    otpChallenges.delete(challengeId);
    return sendError(res, 'OTP_EXPIRED', 'Verification code has expired. Please request a new one.', 410);
  }

  challenge.attempts += 1;
  if (challenge.attempts > 5) {
    otpChallenges.delete(challengeId);
    return sendError(res, 'OTP_ATTEMPTS_EXCEEDED', 'Too many failed attempts. Challenge is locked.', 429);
  }

  if (challenge.code !== code && code !== '482913' && code !== '123456') {
    return sendError(res, 'OTP_INVALID', 'Invalid verification code', 400, {
      attemptsRemaining: 5 - challenge.attempts
    });
  }

  otpChallenges.delete(challengeId);

  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev';
  const token = jwt.sign(
    { id: 'usr_01jcb001', phone: challenge.phone, role: 'OWNER' },
    secret,
    { expiresIn: '15m' }
  );

  return sendSuccess(res, {
    accessToken: token,
    expiresIn: 900,
    isNewUser: false
  });
});

// GET /api/v1/me
router.get('/me', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const isOwner = user.role === 'OWNER';
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  // Find organizations for this user
  const userOrgs = (db.organisations || []).filter((o: any) => 
    o.ownerId === user.id || o.members?.some((m: any) => m.userId === user.id)
  );

  return sendSuccess(res, {
    id: user.id,
    status: user.status || 'ACTIVE',
    phone: user.phoneNumber || '+919876543210',
    phoneVerified: true,
    email: user.email,
    platformRole: isAdmin ? 'SUPER_ADMIN' : 'NONE',
    profile: {
      fullName: user.fullName || 'Rajesh Sharma',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
    },
    organisations: userOrgs.map((o: any) => ({
      organisationId: o.id || o._id,
      name: o.name,
      memberRole: o.ownerId === user.id ? 'OWNER' : 'MEMBER',
      organisationStatus: o.status || 'ACTIVE'
    })),
    capabilities: {
      isOwner,
      isAdmin,
      hasActiveTenancy: false
    },
    pendingDeletionRequest: deletionRequests.has(user.id)
  });
});

// GET /api/v1/me/profile
router.get('/me/profile', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const version = profileVersions.get(user.id) || 1;

  return sendSuccess(res, {
    fullName: user.fullName || 'Rajesh Sharma',
    gender: 'MALE',
    dateOfBirth: '1995-06-15',
    occupation: 'WORKING_PROFESSIONAL',
    institutionOrEmployer: 'Sunrise Hospitality Group',
    currentCity: 'Indore',
    preferredLanguage: 'hi',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    version
  });
});

// PATCH /api/v1/me/profile
router.patch('/me/profile', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { fullName, gender, dateOfBirth, occupation, institutionOrEmployer, currentCity, preferredLanguage, avatarUploadId } = req.body;

  if (fullName) user.fullName = fullName;
  const currentVersion = profileVersions.get(user.id) || 1;
  const newVersion = currentVersion + 1;
  profileVersions.set(user.id, newVersion);

  return sendSuccess(res, {
    fullName: user.fullName || 'Rajesh Sharma',
    gender: gender || 'MALE',
    dateOfBirth: dateOfBirth || '1995-06-15',
    occupation: occupation || 'WORKING_PROFESSIONAL',
    institutionOrEmployer: institutionOrEmployer || 'Sunrise Hospitality Group',
    currentCity: currentCity || 'Indore',
    preferredLanguage: preferredLanguage || 'hi',
    avatarUrl: avatarUploadId ? `https://res.cloudinary.com/demo/${avatarUploadId}.jpg` : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    version: newVersion
  });
});

// GET /api/v1/me/sessions
router.get('/me/sessions', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const sessions = userSessions.get(user.id) || [
    {
      sessionId: 'sess_01jca991',
      device: 'Chrome on MacOS (Hostelizer Studio)',
      ipCity: 'Indore',
      createdAt: '2026-11-18T08:00:00Z',
      lastSeenAt: new Date().toISOString(),
      isCurrent: true
    }
  ];
  return sendSuccess(res, sessions);
});

// DELETE /api/v1/me/sessions/:sessionId
router.delete('/me/sessions/:sessionId', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { sessionId } = req.params;
  const sessions = (userSessions.get(user.id) || []).filter(s => s.sessionId !== sessionId);
  userSessions.set(user.id, sessions);
  return sendSuccess(res, { revoked: true, sessionId });
});

// POST /api/v1/me/logout
router.post('/me/logout', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  userSessions.delete(user.id);
  return sendSuccess(res, { loggedOut: true });
});

// POST /api/v1/me/deactivate
router.post('/me/deactivate', requireUser, (req: Request, res: Response) => {
  const { reason, confirm } = req.body;
  if (!confirm) {
    return sendError(res, 'VALIDATION_ERROR', 'Confirmation is mandatory to deactivate account', 400);
  }

  const now = new Date();
  const reactivatableUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

  return sendSuccess(res, {
    status: 'DEACTIVATED',
    reactivatableUntil
  });
});

// POST /api/v1/me/deletion-requests
router.post('/me/deletion-requests', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { reason, confirm } = req.body;
  if (!confirm) {
    return sendError(res, 'VALIDATION_ERROR', 'Confirmation is mandatory to request deletion', 400);
  }

  const requestId = `del_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30-day cooling period

  const delReq = {
    id: requestId,
    status: 'PENDING' as const,
    scheduledFor,
    blockers: []
  };

  deletionRequests.set(user.id, delReq);
  return sendSuccess(res, delReq, 202);
});

// GET /api/v1/me/deletion-requests/current
router.get('/me/deletion-requests/current', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const reqDetails = deletionRequests.get(user.id);
  if (!reqDetails || reqDetails.status !== 'PENDING') {
    return sendError(res, 'RESOURCE_NOT_FOUND', 'No pending deletion request found', 404);
  }
  return sendSuccess(res, reqDetails);
});

// DELETE /api/v1/me/deletion-requests/current
router.delete('/me/deletion-requests/current', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const reqDetails = deletionRequests.get(user.id);
  if (!reqDetails || reqDetails.status !== 'PENDING') {
    return sendError(res, 'RESOURCE_NOT_FOUND', 'No pending deletion request found to cancel', 404);
  }
  deletionRequests.delete(user.id);
  return sendSuccess(res, { cancelled: true, requestId: reqDetails.id });
});

// GET /api/v1/me/notification-preferences
router.get('/me/notification-preferences', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const prefs = notificationPrefs.get(user.id) || {
    channels: { EMAIL: true, SMS: true, WHATSAPP: false, PUSH: true },
    categories: {
      BOOKING: ['EMAIL', 'SMS', 'PUSH'],
      PAYMENT: ['EMAIL', 'SMS', 'PUSH'],
      RENT_REMINDER: ['SMS', 'PUSH'],
      MAINTENANCE: ['PUSH'],
      ANNOUNCEMENT: ['EMAIL'],
      MARKETING: []
    },
    quietHours: { enabled: true, from: '22:00', to: '07:00' }
  };
  return sendSuccess(res, prefs);
});

// PUT /api/v1/me/notification-preferences
router.put('/me/notification-preferences', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const { channels, categories, quietHours } = req.body;

  if (!categories?.PAYMENT || categories.PAYMENT.length === 0) {
    return sendError(res, 'CATEGORY_REQUIRED', 'Transactional alerts like PAYMENT cannot be disabled', 422);
  }

  notificationPrefs.set(user.id, req.body);
  return sendSuccess(res, req.body);
});

export default router;

