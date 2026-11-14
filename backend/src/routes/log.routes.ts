import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { db, DBAuditLog } from '../store/memoryStore';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuditLogModel } from '../models/mongodb.models';

const router = Router();

// =========================================================================
// 1. QUERY AUDIT LOGS (/log, /dashboard/logs backend API)
// =========================================================================
router.get('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  const { action, orgId, limit } = req.query;
  const isSuperAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'VERIFICATION_ADMIN';

  let logs = [...db.auditLogs];

  // Multi-tenant isolation: If not Super Admin, strictly filter to user's organisation
  if (!isSuperAdmin) {
    const user = db.users.find(u => u.id === req.user!.id);
    const userOrgId = user?.orgId;
    logs = logs.filter(l => l.orgId === userOrgId || l.userId === req.user!.id);
  } else if (orgId) {
    logs = logs.filter(l => l.orgId === orgId);
  }

  if (action) {
    logs = logs.filter(l => l.action === (action as string).toUpperCase());
  }

  const maxLimit = parseInt((limit as string) || '50', 10);
  const slicedLogs = logs.slice(0, maxLimit);

  return res.json({
    logs: slicedLogs,
    count: slicedLogs.length,
    total: logs.length
  });
});

// =========================================================================
// 2. INGEST AUDIT LOG EVENT
// =========================================================================
router.post('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, resource, status, details, orgId, orgName } = req.body;

    if (!action || !resource) {
      return res.status(400).json({ error: 'Action and resource are required for audit logging' });
    }

    const logEntry: DBAuditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date(),
      userId: req.user!.id,
      userName: req.user!.email.split('@')[0],
      userEmail: req.user!.email,
      orgId: orgId || req.user!.ownerProfileId || 'default-tenant',
      orgName: orgName || 'Hostelizer Platform',
      action: (action as string).toUpperCase(),
      resource,
      status: (status === 'FAILURE' || status === 'WARNING' ? status : 'SUCCESS') as any,
      details: details || '',
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    };

    db.auditLogs.unshift(logEntry);

    // Sync to MongoDB Compass
    if (mongoose.connection.readyState === 1) {
      try {
        await AuditLogModel.create(logEntry);
      } catch (mongoErr) {
        console.warn('MongoDB sync note in log ingestion:', mongoErr);
      }
    }

    return res.status(201).json({ message: 'Audit event logged successfully', log: logEntry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

