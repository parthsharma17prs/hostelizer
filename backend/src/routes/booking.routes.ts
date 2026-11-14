import { Router, Response } from 'express';
import { db, DBBooking, DBVisit } from '../store/memoryStore';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Schedule a Property Visit (Customer)
router.post('/visits', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, preferredDate, timeSlot, notes } = req.body;
  if (!propertyId || !preferredDate || !timeSlot) {
    return res.status(400).json({ error: 'Property ID, preferred date, and time slot are required' });
  }

  const prop = db.properties.find(p => p.id === propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const visit: DBVisit = {
    id: 'visit_' + Date.now(),
    customerId: req.user!.id,
    propertyId,
    preferredDate,
    timeSlot,
    status: 'REQUESTED',
    notes,
    createdAt: new Date()
  };

  db.visits.push(visit);

  // Automatically record this in the Owner's Lead Pipeline
  const ownerUser = db.users.find(u => u.id === req.user!.id);
  db.leads.push({
    id: 'lead_' + Date.now(),
    ownerProfileId: prop.ownerProfileId,
    propertyId: prop.id,
    customerName: ownerUser?.name || 'Prospective Resident',
    customerPhone: ownerUser?.phone || '9876543210',
    customerEmail: ownerUser?.email,
    status: 'VISIT_SCHEDULED',
    notes: `Visit requested for ${preferredDate} at ${timeSlot}`,
    createdAt: new Date()
  });

  res.status(201).json({ message: 'Visit scheduled successfully', visit });
});

// Book Bed with Concurrency Protection (Customer)
router.post('/', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const { propertyId, roomId, bedId, startDate } = req.body;

  const prop = db.properties.find(p => p.id === propertyId);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const room = prop.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const bed = room.beds.find(b => b.id === bedId);
  if (!bed) return res.status(404).json({ error: 'Bed not found' });

  // Critical Invariant: Atomic bed status check to prevent double bookings
  if (bed.status !== 'AVAILABLE') {
    return res.status(409).json({
      error: `Bed ${bed.bedCode} is already ${bed.status}. Please select another bed.`
    });
  }

  // Lock the bed
  bed.status = 'HELD';
  bed.heldUntil = new Date(Date.now() + 30 * 60 * 1000); // 30-min hold for payment

  const booking: DBBooking = {
    id: 'bk_' + Date.now(),
    customerId: req.user!.id,
    propertyId,
    roomId,
    bedId,
    startDate: new Date(startDate || Date.now()),
    status: 'CONFIRMED',
    monthlyRent: room.monthlyRent,
    tokenPaid: 2000, // Token reservation deposit
    createdAt: new Date()
  };

  // Convert bed to occupied once confirmed
  bed.status = 'OCCUPIED';
  db.bookings.push(booking);

  res.status(201).json({
    message: `Bed ${bed.bedCode} successfully reserved. Token reservation of ₹2,000 confirmed.`,
    booking
  });
});

// List Customer's Bookings
router.get('/my-bookings', authenticateJwt, (req: AuthenticatedRequest, res: Response) => {
  const customerBookings = db.bookings.filter(b => b.customerId === req.user!.id).map(b => {
    const prop = db.properties.find(p => p.id === b.propertyId);
    return {
      ...b,
      propertyName: prop?.name,
      propertyAddress: prop?.address,
      city: prop?.city
    };
  });
  res.json({ bookings: customerBookings });
});

export default router;

