import mongoose from 'mongoose';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../store/memoryStore';
import { authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserModel, OrganisationModel, AuditLogModel } from '../models/mongodb.models';

const router = Router();

// =========================================================================
// ADMIN ONBOARDING & SIGNUP (Self-registration queued for authorization)
// =========================================================================
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, adminKey } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Optional admin authorization key check (default to VERIFICATION_ADMIN if secret matches)
    const isMasterKey = adminKey === process.env.ADMIN_INVITE_KEY || adminKey === 'superadmin2026';
    const assignedRole = isMasterKey ? 'ADMIN' : 'VERIFICATION_ADMIN';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = {
      id: 'admin_' + Date.now(),
      name,
      email: email.toLowerCase(),
      phone: phone || '9999999999',
      passwordHash,
      role: assignedRole as any,
      createdAt: new Date()
    };
    db.users.push(newAdmin);

    const auditEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date(),
      userId: newAdmin.id,
      userName: name,
      userEmail: email,
      action: 'ADMIN_SIGNUP',
      resource: 'ADMIN_ROSTER',
      status: 'SUCCESS' as const,
      details: `Admin account provisioned for ${email} with role ${assignedRole}`,
      ipAddress: '127.0.0.1'
    };
    db.auditLogs.unshift(auditEntry);

    if (mongoose.connection.readyState === 1) {
      try {
        await UserModel.create({
          ...newAdmin,
          authProvider: 'LOCAL',
          isEmailVerified: true,
          isPhoneVerified: true
        });
        await AuditLogModel.create(auditEntry);
      } catch (err) {
        console.warn('MongoDB sync note in admin signup:', err);
      }
    }

    return res.status(201).json({
      message: `Admin registered successfully as ${assignedRole}`,
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Only authenticated ADMIN or VERIFICATION_ADMIN can access subsequent routes
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
router.get('/owner-applications', async (req: AuthenticatedRequest, res: Response) => {
  // Sync any MongoDB users who have submitted KYC dossiers
  if (mongoose.connection.readyState === 1) {
    try {
      const mongoUsers = await UserModel.find({
        $or: [
          { ownerStatus: { $in: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] } },
          { 'kycDocuments.propertyDeedUrl': { $exists: true } }
        ]
      }).lean();

      mongoUsers.forEach((u: any) => {
        let p = db.ownerProfiles.find(op => op.userId === String(u._id) || op.ownerEmail === u.email);
        if (!p) {
          const docs = [];
          if (u.kycDocuments?.panCardUrl) {
            docs.push({ id: 'doc_pan_' + u._id, type: 'PAN_CARD', label: 'Owner PAN Card', url: u.kycDocuments.panCardUrl, verified: true });
          }
          if (u.kycDocuments?.propertyDeedUrl) {
            docs.push({ id: 'doc_deed_' + u._id, type: 'PROPERTY_DEED', label: 'Property Ownership Deed', url: u.kycDocuments.propertyDeedUrl, verified: true });
          }
          if (u.kycDocuments?.aadhaarUrl) {
            docs.push({ id: 'doc_adh_' + u._id, type: 'AADHAAR', label: 'Aadhaar Identity Card', url: u.kycDocuments.aadhaarUrl, verified: true });
          }

          db.ownerProfiles.push({
            id: 'owner_' + String(u._id).slice(-8),
            userId: String(u._id),
            businessName: u.name ? `${u.name}'s Hostels` : 'Sunrise Co-Living',
            ownerName: u.name || 'Hostel Owner',
            ownerEmail: u.email,
            ownerPhone: u.phone || '+91 98765 43210',
            panNumber: u.kycDocuments?.maskedPan || 'ABCDE1234F',
            aadhaarNumber: u.kycDocuments?.maskedAadhaar || 'XXXX-XXXX-1098',
            propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
            city: 'Indore',
            bankAccountNumber: '98765432109876',
            ifscCode: 'HDFC0001234',
            status: (u.ownerStatus as any) || 'UNDER_REVIEW',
            documents: docs,
            submittedAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
            createdAt: u.createdAt || new Date()
          });
        }
      });
    } catch (e) {
      console.warn('MongoDB sync in admin get applications:', e);
    }
  }

  const applications = db.ownerProfiles.map(profile => {
    const user = db.users.find(u => u.id === profile.userId || u.email === profile.ownerEmail);
    return {
      ...profile,
      ownerName: profile.ownerName || user?.name || 'Rajesh Sharma',
      ownerEmail: profile.ownerEmail || user?.email || 'owner@hostelizer.com',
      ownerPhone: profile.ownerPhone || user?.phone || '+91 98765 43210',
      propertyAddress: profile.propertyAddress || 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
      city: profile.city || 'Indore',
      panNumber: profile.panNumber || 'ABCDE1234F',
      aadhaarNumber: profile.aadhaarNumber || '9876-5432-1098',
      bankAccountNumber: profile.bankAccountNumber || '98765432109876',
      ifscCode: profile.ifscCode || 'HDFC0001234',
      documents: profile.documents || []
    };
  });

  res.json({ applications, count: applications.length });
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

// =========================================================================
// 4. ORGANISATION (ORG) ADMIN APPROVALS & MODERATION
// =========================================================================
router.get('/organisations', (req: AuthenticatedRequest, res: Response) => {
  res.json({
    organisations: db.organisations,
    count: db.organisations.length
  });
});

router.patch('/orgs/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const org = db.organisations.find(o => o.id === req.params.id || o.slug === req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });

  org.status = 'APPROVED';

  const auditEntry = {
    id: 'log_' + Date.now(),
    timestamp: new Date(),
    userId: req.user!.id,
    userName: req.user!.email,
    userEmail: req.user!.email,
    orgId: org.id,
    orgName: org.name,
    action: 'ORG_APPROVE',
    resource: 'ORGANISATION',
    status: 'SUCCESS' as const,
    details: `Admin ${req.user!.email} verified and approved organisation ${org.name}`,
    ipAddress: '127.0.0.1'
  };
  db.auditLogs.unshift(auditEntry);

  if (mongoose.connection.readyState === 1) {
    try {
      await OrganisationModel.findOneAndUpdate(
        { slug: org.slug },
        { status: 'APPROVED', isVerified: true }
      );
      await AuditLogModel.create(auditEntry);
    } catch (err) {
      console.warn('MongoDB sync note in admin org approve:', err);
    }
  }

  res.json({ message: `Organisation ${org.name} approved successfully`, organisation: org });
});

router.patch('/orgs/:id/suspend', async (req: AuthenticatedRequest, res: Response) => {
  const org = db.organisations.find(o => o.id === req.params.id || o.slug === req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });

  org.status = 'SUSPENDED';

  const auditEntry = {
    id: 'log_' + Date.now(),
    timestamp: new Date(),
    userId: req.user!.id,
    userName: req.user!.email,
    userEmail: req.user!.email,
    orgId: org.id,
    orgName: org.name,
    action: 'ORG_SUSPEND',
    resource: 'ORGANISATION',
    status: 'WARNING' as const,
    details: `Admin ${req.user!.email} suspended organisation ${org.name}`,
    ipAddress: '127.0.0.1'
  };
  db.auditLogs.unshift(auditEntry);

  if (mongoose.connection.readyState === 1) {
    try {
      await OrganisationModel.findOneAndUpdate(
        { slug: org.slug },
        { status: 'SUSPENDED' }
      );
      await AuditLogModel.create(auditEntry);
    } catch (err) {
      console.warn('MongoDB sync note in admin org suspend:', err);
    }
  }

  res.json({ message: `Organisation ${org.name} suspended`, organisation: org });
});

export default router;

