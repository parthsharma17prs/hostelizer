import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { db } from '../store/memoryStore';
import { authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/mongodb.models';

const router = Router();

// Only ADMIN or VERIFICATION_ADMIN can access
router.use(authenticateJwt);
router.use(requireRoles(['ADMIN', 'VERIFICATION_ADMIN']));

// 1. Get Platform Metrics Overview
router.get('/analytics/platform', (req: AuthenticatedRequest, res: Response) => {
  const totalCustomers = db.users.filter(u => u.role === 'CUSTOMER').length;
  const totalOwners = db.users.filter(u => u.role === 'OWNER').length;
  const approvedOwners = db.ownerProfiles.filter(o => o.status === 'APPROVED').length;
  const pendingOwnerApplications = db.ownerProfiles.filter(o => o.status === 'PENDING').length;
  const totalProperties = db.properties.length;
  const publishedProperties = db.properties.filter(p => p.status === 'PUBLISHED').length;
  const pendingPropertyApprovals = db.properties.filter(p => p.status === 'SUBMITTED').length;

  res.json({
    metrics: {
      totalCustomers,
      totalOwners,
      approvedOwners,
      pendingOwnerApplications,
      totalProperties,
      publishedProperties,
      pendingPropertyApprovals,
      totalBookings: db.bookings.length,
      totalVisits: db.visits.length
    }
  });
});

// 2. Owner Applications Management
router.get('/owner-applications', (req: AuthenticatedRequest, res: Response) => {
  const applications = db.ownerProfiles.map(profile => {
    const user = db.users.find(u => u.id === profile.userId);
    return {
      ...profile,
      ownerName: user?.name,
      ownerEmail: user?.email,
      ownerPhone: user?.phone
    };
  });
  res.json({ applications });
});

router.patch('/owner-applications/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const profile = db.ownerProfiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Owner application not found' });

  profile.status = 'APPROVED';
  profile.reviewedBy = req.user!.email;

  // Sync approval to MongoDB Compass
  if (mongoose.connection.readyState === 1) {
    try {
      const user = db.users.find(u => u.id === profile.userId);
      if (user) {
        await UserModel.findOneAndUpdate(
          { email: user.email },
          { 
            ownerStatus: 'APPROVED',
            'kycDocuments.verifiedAt': new Date()
          },
          { returnDocument: 'after' }
        );
      }
    } catch (mongoErr) {
      console.warn('MongoDB sync note in admin approve:', mongoErr);
    }
  }

  res.json({ message: 'Owner approved successfully', profile });
});

router.patch('/owner-applications/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Mandatory rejection reason required' });

  const profile = db.ownerProfiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: 'Owner application not found' });

  profile.status = 'REJECTED';
  profile.rejectionReason = reason;
  profile.reviewedBy = req.user!.email;

  // Sync rejection to MongoDB Compass
  if (mongoose.connection.readyState === 1) {
    try {
      const user = db.users.find(u => u.id === profile.userId);
      if (user) {
        await UserModel.findOneAndUpdate(
          { email: user.email },
          { ownerStatus: 'REJECTED' },
          { returnDocument: 'after' }
        );
      }
    } catch (mongoErr) {
      console.warn('MongoDB sync note in admin reject:', mongoErr);
    }
  }

  res.json({ message: 'Owner application rejected', profile });
});

// 3. Property Moderation & Approvals
router.get('/property-approvals', (req: AuthenticatedRequest, res: Response) => {
  const properties = db.properties.map(p => {
    const ownerProfile = db.ownerProfiles.find(op => op.id === p.ownerProfileId);
    const ownerUser = ownerProfile ? db.users.find(u => u.id === ownerProfile.userId) : null;
    return {
      ...p,
      ownerBusinessName: ownerProfile?.businessName,
      ownerEmail: ownerUser?.email,
      ownerPhone: ownerUser?.phone
    };
  });
  res.json({ properties });
});

router.patch('/property-approvals/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const prop = db.properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  prop.status = 'PUBLISHED';
  res.json({ message: 'Property approved and published to marketplace', property: prop });
});

router.patch('/property-approvals/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  const prop = db.properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  prop.status = 'REJECTED';
  prop.rejectionReason = reason || 'Does not meet marketplace standards';
  res.json({ message: 'Property rejected', property: prop });
});

export default router;

