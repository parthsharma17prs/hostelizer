import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sendSuccess, sendError } from '../middleware/envelope.middleware';
import { requireUser, requireAdmin, getReqUser } from '../middleware/auth.v1';
import { db, DBOwnerProfile } from '../../store/memoryStore';
import { UserModel } from '../../models/mongodb.models';

const router = Router();

// =========================================================================
// 1. OWNER KYC DOSSIER INTAKE & SUBMISSION
// =========================================================================
router.post('/kyc/apply', requireUser, async (req: Request, res: Response) => {
  try {
    const user = getReqUser(req);
    const {
      businessName,
      ownerName,
      contactNumber,
      propertyAddress,
      city,
      panNumber,
      aadhaarNumber,
      bankAccountNumber,
      ifscCode,
      documents
    } = req.body;

    if (!businessName || !ownerName || !propertyAddress || !panNumber || !aadhaarNumber) {
      return sendError(res, 'VALIDATION_ERROR', 'Mandatory KYC dossier fields missing (businessName, ownerName, propertyAddress, panNumber, aadhaarNumber)', 400);
    }

    const applicationId = 'HSTL-2026-APP-' + (user.id ? user.id.slice(-6).toUpperCase() : randomUUID().slice(0, 6).toUpperCase());
    const submittedAt = new Date().toISOString();

    // 1. Promote memory user & sync profile
    const existingUser = db.users.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existingUser) {
      existingUser.role = 'OWNER';
      existingUser.ownerStatus = 'UNDER_REVIEW';
      if (ownerName) existingUser.name = ownerName;
      if (contactNumber) existingUser.phone = contactNumber;
    }

    let profile = db.ownerProfiles.find(p => p.userId === user.id || p.ownerEmail === user.email);
    const formattedDocs = Array.isArray(documents) && documents.length > 0 
      ? documents.map((d: any, idx: number) => ({
          id: `doc_${Date.now()}_${idx}`,
          type: String(d.type || 'PROPERTY_DEED'),
          label: String(d.label || d.name || d.type || 'Document'),
          url: String(d.url || 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/deed.pdf'),
          verified: false
        }))
      : [
          { id: `doc_${Date.now()}_0`, type: 'PAN_CARD', label: 'Owner PAN Card', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/pan_mehta.pdf', verified: false },
          { id: `doc_${Date.now()}_1`, type: 'PROPERTY_DEED', label: 'Property Ownership Deed', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/property_deed_koramangala.pdf', verified: false },
          { id: `doc_${Date.now()}_2`, type: 'AADHAAR', label: 'Aadhaar Identity Card', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/aadhaar_mehta.pdf', verified: false }
        ];

    if (!profile) {
      const newProfile: DBOwnerProfile = {
        id: applicationId,
        userId: user.id,
        businessName,
        ownerName,
        ownerEmail: user.email,
        ownerPhone: contactNumber || user.phoneNumber || '+91 98765 43210',
        propertyAddress,
        city: city || 'Indore',
        panNumber,
        aadhaarNumber,
        bankAccountNumber: bankAccountNumber || '98765432109876',
        ifscCode: ifscCode || 'HDFC0001234',
        status: 'UNDER_REVIEW',
        documents: formattedDocs,
        submittedAt,
        createdAt: new Date()
      };
      db.ownerProfiles.push(newProfile);
      profile = newProfile;
    } else {
      profile.businessName = businessName;
      profile.ownerName = ownerName;
      profile.ownerPhone = contactNumber || profile.ownerPhone;
      profile.propertyAddress = propertyAddress;
      profile.city = city || profile.city;
      profile.panNumber = panNumber;
      profile.aadhaarNumber = aadhaarNumber;
      profile.bankAccountNumber = bankAccountNumber || profile.bankAccountNumber;
      profile.ifscCode = ifscCode || profile.ifscCode;
      profile.status = 'UNDER_REVIEW';
      profile.documents = formattedDocs;
      profile.submittedAt = submittedAt;
    }

    // 2. Sync to MongoDB UserModel if active
    try {
      await UserModel.findOneAndUpdate(
        { email: user.email.toLowerCase() },
        {
          $set: {
            role: 'OWNER',
            ownerStatus: 'UNDER_REVIEW',
            name: ownerName,
            phone: contactNumber || user.phoneNumber,
            'ownerProfile.businessName': businessName,
            'ownerProfile.ownerName': ownerName,
            'ownerProfile.propertyAddress': propertyAddress,
            'ownerProfile.city': city || 'Indore',
            'ownerProfile.panNumber': panNumber,
            'ownerProfile.aadhaarNumber': aadhaarNumber,
            'ownerProfile.bankAccountNumber': bankAccountNumber,
            'ownerProfile.ifscCode': ifscCode,
            'ownerProfile.status': 'UNDER_REVIEW',
            'ownerProfile.submittedAt': submittedAt
          }
        },
        { new: true, upsert: false }
      );
    } catch (mongoErr) {
      console.warn('MongoDB sync note:', mongoErr);
    }

    // 3. Record Security Audit Log
    db.auditLogs.unshift({
      id: 'log_' + Date.now(),
      userId: user.id,
      userEmail: user.email,
      action: 'OWNER_APPLICATION_SUBMITTED',
      resource: 'OWNER_APPLICATION',
      status: 'SUCCESS',
      details: `Owner application ${applicationId} submitted for business '${businessName}'. 48h SLA verification active.`,
      ipAddress: req.ip || '127.0.0.1',
      timestamp: new Date()
    });

    return sendSuccess(res, {
      applicationId,
      status: 'UNDER_REVIEW',
      slaHours: 48,
      submittedAt,
      message: 'Congratulations! You have applied. Application is currently under review and will be verified within 48 hours.'
    }, 201);
  } catch (err: any) {
    return sendError(res, 'INTERNAL_ERROR', err.message || 'Failed to submit KYC dossier', 500);
  }
});

// =========================================================================
// 2. CALLER'S LIVE KYC STATUS
// =========================================================================
router.get('/kyc/status', requireUser, (req: Request, res: Response) => {
  const user = getReqUser(req);
  const profile = db.ownerProfiles.find(p => p.userId === user.id || p.ownerEmail === user.email);

  if (!profile) {
    return sendSuccess(res, {
      applicationId: null,
      status: 'PENDING',
      submittedAt: null,
      dossier: null
    });
  }

  return sendSuccess(res, {
    applicationId: profile.id,
    status: profile.status,
    slaHours: 48,
    submittedAt: profile.submittedAt || new Date().toISOString(),
    dossier: {
      businessName: profile.businessName,
      ownerName: profile.ownerName,
      ownerEmail: profile.ownerEmail,
      ownerPhone: profile.ownerPhone,
      propertyAddress: profile.propertyAddress,
      city: profile.city,
      panNumber: profile.panNumber,
      aadhaarNumber: profile.aadhaarNumber,
      bankAccountNumber: profile.bankAccountNumber,
      ifscCode: profile.ifscCode,
      documents: profile.documents
    }
  });
});

// =========================================================================
// 3. SUPER ADMIN KYC VERIFICATION QUEUE
// =========================================================================
router.get('/admin/kyc/applications', requireUser, requireAdmin, (req: Request, res: Response) => {
  const applications = db.ownerProfiles.map(p => ({
    id: p.id,
    userId: p.userId,
    businessName: p.businessName,
    ownerName: p.ownerName,
    ownerEmail: p.ownerEmail,
    ownerPhone: p.ownerPhone,
    propertyAddress: p.propertyAddress,
    city: p.city,
    panNumber: p.panNumber,
    aadhaarNumber: p.aadhaarNumber,
    bankAccountNumber: p.bankAccountNumber,
    ifscCode: p.ifscCode,
    status: p.status,
    submittedAt: p.submittedAt,
    documents: p.documents || []
  }));

  return sendSuccess(res, {
    total: applications.length,
    underReviewCount: applications.filter(a => a.status === 'UNDER_REVIEW').length,
    approvedCount: applications.filter(a => a.status === 'APPROVED').length,
    applications
  });
});

// =========================================================================
// 4. SUPER ADMIN APPROVE KYC APPLICATION
// =========================================================================
router.post('/admin/kyc/approve', requireUser, requireAdmin, async (req: Request, res: Response) => {
  const { userId, applicationId } = req.body;
  if (!userId && !applicationId) {
    return sendError(res, 'VALIDATION_ERROR', 'userId or applicationId is required', 400);
  }

  const profile = db.ownerProfiles.find(p => p.id === applicationId || p.userId === userId);
  if (!profile) {
    return sendError(res, 'RESOURCE_NOT_FOUND', 'KYC application not found', 404);
  }

  profile.status = 'APPROVED';
  const targetUser = db.users.find(u => u.id === profile.userId || (profile.ownerEmail && u.email === profile.ownerEmail));
  if (targetUser) {
    targetUser.role = 'OWNER';
    targetUser.ownerStatus = 'APPROVED';
  }

  if (profile.ownerEmail) {
    try {
      await UserModel.findOneAndUpdate(
        { email: profile.ownerEmail.toLowerCase() },
        { $set: { role: 'OWNER', ownerStatus: 'APPROVED', 'ownerProfile.status': 'APPROVED' } }
      );
    } catch (e) {
      console.warn('MongoDB approval sync note:', e);
    }
  }

  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    userId: getReqUser(req).id,
    userEmail: getReqUser(req).email,
    action: 'OWNER_APPLICATION_APPROVED',
    resource: 'OWNER_APPLICATION',
    status: 'SUCCESS',
    details: `Super Admin approved KYC dossier for '${profile.businessName}' (${profile.ownerEmail}). Partner account certified.`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date()
  });

  return sendSuccess(res, {
    approved: true,
    applicationId: profile.id,
    ownerEmail: profile.ownerEmail,
    status: 'APPROVED'
  });
});

// =========================================================================
// 5. SUPER ADMIN REJECT KYC APPLICATION
// =========================================================================
router.post('/admin/kyc/reject', requireUser, requireAdmin, async (req: Request, res: Response) => {
  const { userId, applicationId, reason } = req.body;
  if (!userId && !applicationId) {
    return sendError(res, 'VALIDATION_ERROR', 'userId or applicationId is required', 400);
  }

  const profile = db.ownerProfiles.find(p => p.id === applicationId || p.userId === userId);
  if (!profile) {
    return sendError(res, 'RESOURCE_NOT_FOUND', 'KYC application not found', 404);
  }

  profile.status = 'REJECTED';
  (profile as any).rejectionReason = reason || 'Document verification could not be completed. Please review guidelines.';

  const targetUser = db.users.find(u => u.id === profile.userId || (profile.ownerEmail && u.email === profile.ownerEmail));
  if (targetUser) {
    targetUser.ownerStatus = 'REJECTED';
  }

  if (profile.ownerEmail) {
    try {
      await UserModel.findOneAndUpdate(
        { email: profile.ownerEmail.toLowerCase() },
        { $set: { ownerStatus: 'REJECTED', 'ownerProfile.status': 'REJECTED' } }
      );
    } catch (e) {
      console.warn('MongoDB rejection sync note:', e);
    }
  }

  db.auditLogs.unshift({
    id: 'log_' + Date.now(),
    userId: getReqUser(req).id,
    userEmail: getReqUser(req).email,
    action: 'OWNER_APPLICATION_REJECTED',
    resource: 'OWNER_APPLICATION',
    status: 'SUCCESS',
    details: `Super Admin rejected KYC dossier for '${profile.businessName}'. Reason: ${reason || 'Unspecified'}`,
    ipAddress: req.ip || '127.0.0.1',
    timestamp: new Date()
  });

  return sendSuccess(res, {
    rejected: true,
    applicationId: profile.id,
    ownerEmail: profile.ownerEmail,
    status: 'REJECTED',
    reason: (profile as any).rejectionReason
  });
});

export default router;
