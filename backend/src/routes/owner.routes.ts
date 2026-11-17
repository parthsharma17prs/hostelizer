import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { db } from '../store/memoryStore';
import { authenticateJwt, requireRoles, requireApprovedOwner, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/mongodb.models';

const router = Router();

// Submit Owner Verification Application (Allows any registered applicant)
router.post('/apply', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { 
      businessName, ownerName, contactNumber, propertyAddress, 
      city, panNumber, aadhaarNumber, bankAccountNumber, ifscCode, documents 
    } = req.body;

    // Promote user to OWNER role if not already
    const user = db.users.find(u => u.id === userId || u.email.toLowerCase() === userEmail.toLowerCase());
    if (user) {
      user.role = 'OWNER';
      user.ownerStatus = 'UNDER_REVIEW';
      if (ownerName) user.name = ownerName;
      if (contactNumber) user.phone = contactNumber;
    }

    let profile = db.ownerProfiles.find(p => p.userId === userId || p.ownerEmail === userEmail);
    if (!profile) {
      profile = {
        id: 'owner_' + Date.now(),
        userId,
        businessName: businessName || (ownerName ? `${ownerName}'s Properties` : 'Sunrise Co-Living'),
        ownerName: ownerName || user?.name || 'Rajesh Sharma',
        ownerEmail: userEmail,
        ownerPhone: contactNumber || user?.phone || '+91 98765 43210',
        propertyAddress: propertyAddress || 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
        city: city || 'Indore',
        panNumber: panNumber || 'ABCDE1234F',
        aadhaarNumber: aadhaarNumber || '9876-5432-1098',
        bankAccountNumber: bankAccountNumber || '98765432109876',
        ifscCode: ifscCode || 'HDFC0001234',
        status: 'UNDER_REVIEW',
        documents: [],
        submittedAt: new Date().toISOString(),
        createdAt: new Date()
      };
      db.ownerProfiles.push(profile);
    } else {
      profile.businessName = businessName || profile.businessName;
      profile.ownerName = ownerName || profile.ownerName || user?.name;
      profile.ownerEmail = userEmail;
      profile.ownerPhone = contactNumber || profile.ownerPhone || user?.phone;
      profile.propertyAddress = propertyAddress || profile.propertyAddress;
      profile.city = city || profile.city;
      profile.panNumber = panNumber || profile.panNumber;
      profile.aadhaarNumber = aadhaarNumber || profile.aadhaarNumber;
      profile.bankAccountNumber = bankAccountNumber || profile.bankAccountNumber;
      profile.ifscCode = ifscCode || profile.ifscCode;
      profile.status = 'UNDER_REVIEW';
      profile.submittedAt = new Date().toISOString();
    }

    if (Array.isArray(documents) && documents.length > 0) {
      profile.documents = documents.map((doc: any, i: number) => ({
        id: `doc_${Date.now()}_${i}`,
        type: doc.type,
        label: doc.label || doc.type,
        url: doc.url,
        verified: false
      }));
    }

    // Record Audit Log for Super Admin Visibility
    const auditEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date(),
      userId,
      userName: profile.ownerName || userEmail,
      userEmail,
      orgId: user?.orgId || 'org-alpha',
      orgName: profile.businessName,
      action: 'KYC_SUBMIT',
      resource: 'OWNER_APPLICATION',
      status: 'SUCCESS' as const,
      details: `Owner ${profile.ownerName} submitted KYC & deed dossier for ${profile.businessName}`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    };
    db.auditLogs.unshift(auditEntry);

    // Update user KYC documents & status in MongoDB Compass
    if (mongoose.connection.readyState === 1) {
      try {
        const panDoc = documents?.find((d: any) => d.type === 'PAN_CARD')?.url;
        const aadhaarDoc = documents?.find((d: any) => d.type === 'AADHAAR')?.url;
        const deedDoc = documents?.find((d: any) => d.type === 'PROPERTY_DEED')?.url;
        await UserModel.findOneAndUpdate(
          { email: userEmail },
          {
            role: 'OWNER',
            ownerStatus: 'UNDER_REVIEW',
            name: profile.ownerName,
            kycDocuments: {
              panCardUrl: panDoc,
              aadhaarUrl: aadhaarDoc,
              propertyDeedUrl: deedDoc,
              maskedPan: panNumber,
              maskedAadhaar: aadhaarNumber
            }
          },
          { returnDocument: 'after' }
        );
      } catch (mongoErr) {
        console.warn('MongoDB sync note in owner apply:', mongoErr);
      }
    }

    res.status(200).json({
      message: 'Owner verification application submitted successfully and queued for Super Admin review',
      profile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check Owner Application Status
router.get('/application-status', authenticateJwt, requireRoles(['OWNER']), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = db.ownerProfiles.find(p => p.userId === userId);
  if (!profile) {
    return res.status(404).json({ error: 'Owner profile not found' });
  }
  res.json({ status: profile.status, rejectionReason: profile.rejectionReason, profile });
});

// Get Owner Properties (Only APPROVED owners can manage)
router.get('/properties', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const ownerProfile = db.ownerProfiles.find(p => p.userId === req.user!.id);
  if (!ownerProfile) {
    return res.status(404).json({ error: 'Owner profile not found' });
  }

  const properties = db.properties.filter(p => p.ownerProfileId === ownerProfile.id);
  res.json({ properties });
});

// Get Owner Dashboard Analytics
router.get('/analytics/overview', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const ownerProfile = db.ownerProfiles.find(p => p.userId === req.user!.id);
  if (!ownerProfile) {
    return res.status(404).json({ error: 'Owner profile not found' });
  }

  const properties = db.properties.filter(p => p.ownerProfileId === ownerProfile.id);
  let totalRooms = 0;
  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;

  properties.forEach(p => {
    p.rooms.forEach(r => {
      totalRooms++;
      r.beds.forEach(b => {
        totalBeds++;
        if (b.status === 'OCCUPIED') occupiedBeds++;
        if (b.status === 'AVAILABLE') availableBeds++;
      });
    });
  });

  const propertyIds = properties.map(p => p.id);
  const bookings = db.bookings.filter(b => propertyIds.includes(b.propertyId));
  const visits = db.visits.filter(v => propertyIds.includes(v.propertyId));
  const leads = db.leads.filter(l => l.ownerProfileId === ownerProfile.id);

  const totalBookingValue = bookings.reduce((sum, b) => sum + (b.monthlyRent || 0), 0);

  res.json({
    metrics: {
      totalProperties: properties.length,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      activeBookings: bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PAID').length,
      pendingBookings: bookings.filter(b => b.status === 'REQUESTED').length,
      upcomingVisits: visits.filter(v => v.status === 'SCHEDULED').length,
      totalLeads: leads.length,
      estimatedMonthlyRentalValue: totalBookingValue
    }
  });
});

// Owner Lead Pipeline
router.get('/leads', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const ownerProfile = db.ownerProfiles.find(p => p.userId === req.user!.id);
  if (!ownerProfile) return res.status(404).json({ error: 'Owner not found' });

  const leads = db.leads.filter(l => l.ownerProfileId === ownerProfile.id);
  res.json({ leads });
});

router.patch('/leads/:id/status', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const { status, notes } = req.body;
  const lead = db.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  lead.status = status || lead.status;
  if (notes) lead.notes = notes;
  res.json({ message: 'Lead updated', lead });
});

export default router;

