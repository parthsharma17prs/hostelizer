import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { db, DBOrganisation, DBOrganisationMember } from '../store/memoryStore';
import { authenticateJwt, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware';
import { OrganisationModel, AuditLogModel } from '../models/mongodb.models';

const router = Router();

// =========================================================================
// 1. ORGANISATION REGISTRATION & ONBOARDING
// =========================================================================
router.post('/register', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, legalName, panNumber, gstNumber, address, city, domain } = req.body;

    if (!name || !legalName || !address || !city) {
      return res.status(400).json({ error: 'Name, legal name, address, and city are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = db.organisations.find(o => o.slug === slug || o.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An organisation with this name or slug already exists' });
    }

    const orgId = 'org_' + Date.now();
    const primaryMember: DBOrganisationMember = {
      userId: req.user!.id,
      name: req.user!.email.split('@')[0],
      email: req.user!.email,
      role: 'ORG_ADMIN',
      joinedAt: new Date()
    };

    const newOrg: DBOrganisation = {
      id: orgId,
      name,
      slug,
      legalName,
      panNumber: panNumber || 'PENDING_AUDIT',
      gstNumber: gstNumber || '',
      ownerId: req.user!.id,
      status: 'PENDING',
      address,
      city,
      members: [primaryMember],
      createdAt: new Date()
    };

    db.organisations.push(newOrg);

    // Update user's active org in memoryStore
    const user = db.users.find(u => u.id === req.user!.id);
    if (user) {
      user.orgId = orgId;
      user.orgRole = 'ORG_ADMIN';
    }

    // Record Audit Log
    const auditEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date(),
      userId: req.user!.id,
      userName: req.user!.email.split('@')[0],
      userEmail: req.user!.email,
      orgId,
      orgName: name,
      action: 'ORG_REGISTER',
      resource: 'ORGANISATION',
      status: 'SUCCESS' as const,
      details: `Registered organisation ${name} (${slug}) under owner ${req.user!.email}`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    };
    db.auditLogs.unshift(auditEntry);

    // Sync to MongoDB Compass
    if (mongoose.connection.readyState === 1) {
      try {
        await OrganisationModel.create({
          name: newOrg.name,
          slug: newOrg.slug,
          legalName: newOrg.legalName,
          panNumber: newOrg.panNumber,
          gstNumber: newOrg.gstNumber,
          ownerId: newOrg.ownerId,
          status: newOrg.status,
          address: newOrg.address,
          city: newOrg.city,
          domain: domain || '',
          members: [primaryMember],
          isVerified: false
        });

        await AuditLogModel.create(auditEntry);
      } catch (mongoErr) {
        console.warn('MongoDB sync note in org register:', mongoErr);
      }
    }

    return res.status(201).json({
      message: 'Organisation registered successfully and queued for verification',
      organisation: newOrg
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// 2. LIST ORGANISATIONS (WITH MULTI-TENANT ISOLATION)
// =========================================================================
router.get('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role === 'ADMIN' || req.user!.role === 'VERIFICATION_ADMIN') {
    // Super Admins can see all tenants
    return res.json({ organisations: db.organisations, count: db.organisations.length });
  }

  // Normal users only see organisations they belong to
  const userOrgs = db.organisations.filter(o => 
    o.ownerId === req.user!.id || o.members.some(m => m.userId === req.user!.id || m.email === req.user!.email)
  );

  return res.json({ organisations: userOrgs, count: userOrgs.length });
});

// =========================================================================
// 3. GET SPECIFIC ORGANISATION PROFILE & MEMBERS
// =========================================================================
router.get('/:id', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const org = db.organisations.find(o => o.id === req.params.id || o.slug === req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });

  // Multi-tenant check: user must belong to this org OR be Super Admin
  const isMember = org.ownerId === req.user!.id || org.members.some(m => m.userId === req.user!.id || m.email === req.user!.email);
  const isSuperAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'VERIFICATION_ADMIN';

  if (!isMember && !isSuperAdmin) {
    return res.status(403).json({
      error: 'Access denied: You do not have permissions to access this organisation data (Tenant Isolation)'
    });
  }

  return res.json({ organisation: org });
});

// =========================================================================
// 4. ADD / INVITE ORGANISATION MEMBER
// =========================================================================
router.post('/:id/members', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  const org = db.organisations.find(o => o.id === req.params.id || o.slug === req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });

  const isOrgAdmin = org.ownerId === req.user!.id || 
    org.members.some(m => (m.userId === req.user!.id || m.email === req.user!.email) && m.role === 'ORG_ADMIN');
  const isSuperAdmin = req.user!.role === 'ADMIN';

  if (!isOrgAdmin && !isSuperAdmin) {
    return res.status(403).json({ error: 'Only Organisation Admins can invite new members' });
  }

  const { email, name, role } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Member email and name are required' });
  }

  const existingMember = org.members.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (existingMember) {
    return res.status(400).json({ error: 'Member with this email is already in the organisation' });
  }

  const newMember: DBOrganisationMember = {
    userId: 'usr_mem_' + Date.now(),
    name,
    email: email.toLowerCase(),
    role: (role === 'ORG_ADMIN' || role === 'ORG_MANAGER' ? role : 'ORG_STAFF') as any,
    joinedAt: new Date()
  };

  org.members.push(newMember);

  // Record Audit Log
  const auditEntry = {
    id: 'log_' + Date.now(),
    timestamp: new Date(),
    userId: req.user!.id,
    userName: req.user!.email,
    userEmail: req.user!.email,
    orgId: org.id,
    orgName: org.name,
    action: 'ORG_MEMBER_ADD',
    resource: 'ORGANISATION_MEMBERS',
    status: 'SUCCESS' as const,
    details: `Added ${name} (${email}) as ${newMember.role} to ${org.name}`,
    ipAddress: '127.0.0.1'
  };
  db.auditLogs.unshift(auditEntry);

  if (mongoose.connection.readyState === 1) {
    try {
      await OrganisationModel.findOneAndUpdate(
        { slug: org.slug },
        { $push: { members: newMember } }
      );
      await AuditLogModel.create(auditEntry);
    } catch (err) {
      console.warn('MongoDB sync note in add member:', err);
    }
  }

  return res.status(201).json({
    message: `Member ${name} added successfully as ${newMember.role}`,
    member: newMember,
    organisation: org
  });
});

// =========================================================================
// 5. TENANT-ISOLATED ORGANISATION DASHBOARD
// =========================================================================
router.get('/:id/dashboard', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const org = db.organisations.find(o => o.id === req.params.id || o.slug === req.params.id);
  if (!org) return res.status(404).json({ error: 'Organisation not found' });

  // Multi-tenant barrier check
  const isMember = org.ownerId === req.user!.id || org.members.some(m => m.userId === req.user!.id || m.email === req.user!.email);
  const isSuperAdmin = req.user!.role === 'ADMIN';

  if (!isMember && !isSuperAdmin) {
    return res.status(403).json({
      error: 'Multi-Tenant Isolation Violation: You are not authorized to view this organisation dashboard'
    });
  }

  // Filter properties and revenue STRICTLY belonging to this organisation
  const orgProperties = db.properties.filter(p => p.orgId === org.id || p.ownerProfileId === org.ownerId);
  const orgPropertyIds = orgProperties.map(p => p.id);
  const orgBookings = db.bookings.filter(b => orgPropertyIds.includes(b.propertyId));

  let totalRooms = 0;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;

  orgProperties.forEach(p => {
    p.rooms.forEach(r => {
      totalRooms++;
      r.beds.forEach(b => {
        totalBeds++;
        if (b.status === 'OCCUPIED') occupiedBeds++;
        if (b.status === 'AVAILABLE') availableBeds++;
      });
    });
  });

  const totalRevenue = orgBookings.reduce((sum, b) => sum + (b.monthlyRent || 0), 0);

  return res.json({
    organisation: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      memberCount: org.members.length
    },
    metrics: {
      totalProperties: orgProperties.length,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      totalRevenue,
      bookingCount: orgBookings.length
    },
    properties: orgProperties,
    members: org.members
  });
});

export default router;

