import mongoose from 'mongoose';
import { Router, Response } from 'express';
import { db } from '../store/memoryStore';
import { authenticateJwt, requireRoles, requireApprovedOwner, AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/mongodb.models';

const router = Router();

// Submit Owner Verification Application (Requires OWNER role)
router.post('/apply', authenticateJwt, requireRoles(['OWNER']), async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { businessName, documents } = req.body;

  let profile = db.ownerProfiles.find(p => p.userId === userId);
  if (!profile) {
    profile = {
      id: 'owner_' + Date.now(),
      userId,
      businessName: businessName || 'My Hostels',
      status: 'PENDING',
      documents: [],
      createdAt: new Date()
    };
    db.ownerProfiles.push(profile);
  } else {
    profile.businessName = businessName || profile.businessName;
    profile.status = 'PENDING';
  }

  if (Array.isArray(documents)) {
    profile.documents = documents.map((doc: any, i: number) => ({
      id: `doc_${Date.now()}_${i}`,
      type: doc.type,
      url: doc.url,
      verified: false
    }));
  }

  // Update user KYC documents & status in MongoDB Compass
  if (mongoose.connection.readyState === 1) {
    try {
      const panDoc = documents?.find((d: any) => d.type === 'PAN_CARD')?.url;
      const aadhaarDoc = documents?.find((d: any) => d.type === 'AADHAAR')?.url;
      const deedDoc = documents?.find((d: any) => d.type === 'PROPERTY_DEED')?.url;
      await UserModel.findOneAndUpdate(
        { email: req.user!.email },
        {
          ownerStatus: 'UNDER_REVIEW',
          kycDocuments: {
            panCardUrl: panDoc,
            aadhaarUrl: aadhaarDoc,
            propertyDeedUrl: deedDoc
          }
        },
        { returnDocument: 'after' }
      );
    } catch (mongoErr) {
      console.warn('MongoDB sync note in owner apply:', mongoErr);
    }
  }

  res.json({
    message: 'Owner verification application submitted successfully',
    profile
  });
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

