import { Router, Request, Response } from 'express';
import { db, DBProperty, DBRoom, DBBed } from '../store/memoryStore';
import { authenticateJwt, requireRoles, requireApprovedOwner, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Public: Search and filter published properties
router.get('/', (req: Request, res: Response) => {
  const { city, locality, gender, maxBudget, food, ac, sharing } = req.query;

  let results = db.properties.filter(p => p.status === 'PUBLISHED');

  if (city) {
    results = results.filter(p => p.city.toLowerCase() === (city as string).toLowerCase());
  }

  if (locality) {
    results = results.filter(p => p.locality.toLowerCase().includes((locality as string).toLowerCase()));
  }

  if (gender) {
    const g = (gender as string).toUpperCase();
    results = results.filter(p => p.genderPreference === g || p.genderPreference === 'COED');
  }

  if (food === 'true') {
    results = results.filter(p => p.foodIncluded === true);
  }

  if (maxBudget) {
    const budget = parseFloat(maxBudget as string);
    results = results.filter(p => p.monthlyRentStarting <= budget);
  }

  if (ac === 'true') {
    results = results.filter(p => p.rooms.some(r => r.hasAC));
  }

  if (sharing) {
    const sType = parseInt(sharing as string);
    const typeMap: Record<number, string> = { 1: 'SINGLE', 2: 'DOUBLE', 3: 'TRIPLE', 4: 'FOUR_SHARING' };
    const targetType = typeMap[sType];
    if (targetType) {
      results = results.filter(p => p.rooms.some(r => r.roomType === targetType));
    }
  }

  res.json({ properties: results, count: results.length });
});

// Public: Get property by ID (only if published, or if owner/admin is inspecting)
router.get('/:id', (req: Request, res: Response) => {
  const prop = db.properties.find(p => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ error: 'Property not found' });
  }

  // Calculate available beds count per room
  const detailedRooms = prop.rooms.map(room => {
    const totalBeds = room.beds.length;
    const availableBeds = room.beds.filter(b => b.status === 'AVAILABLE').length;
    return {
      ...room,
      totalBeds,
      availableBeds
    };
  });

  res.json({
    property: {
      ...prop,
      rooms: detailedRooms
    }
  });
});

// Owner: Create a new Property Listing (Starts in DRAFT status)
router.post('/', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const ownerProfile = db.ownerProfiles.find(op => op.userId === req.user!.id);
  if (!ownerProfile) return res.status(404).json({ error: 'Owner profile not found' });

  const {
    name,
    description,
    genderPreference,
    address,
    city,
    locality,
    pincode,
    latitude,
    longitude,
    monthlyRentStarting,
    foodIncluded,
    amenities,
    images
  } = req.body;

  const newProperty: DBProperty = {
    id: 'prop_' + Date.now(),
    ownerProfileId: ownerProfile.id,
    name: name || 'Untitled Property',
    description: description || '',
    genderPreference: genderPreference || 'COED',
    status: 'DRAFT',
    address: address || '',
    city: city || 'Indore',
    locality: locality || 'Vijay Nagar',
    pincode: pincode || '452010',
    latitude: latitude || 22.75,
    longitude: longitude || 75.89,
    monthlyRentStarting: monthlyRentStarting || 6000,
    foodIncluded: foodIncluded || false,
    amenities: amenities || ['Wi-Fi'],
    images: images || [],
    rooms: [],
    createdAt: new Date()
  };

  db.properties.push(newProperty);
  res.status(201).json({ message: 'Property created in DRAFT mode', property: newProperty });
});

// Owner: Add Room and Bed Hierarchy to a Property
router.post('/:id/rooms', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const prop = db.properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const { roomNumber, roomType, capacity, hasAC, monthlyRent, deposit } = req.body;
  const roomId = 'room_' + Date.now();
  const cap = capacity || 2;

  // Auto-generate Bed records for this room (e.g., "101-A", "101-B")
  const letters = ['A', 'B', 'C', 'D'];
  const beds: DBBed[] = [];
  for (let i = 0; i < cap; i++) {
    beds.push({
      id: `bed_${roomId}_${letters[i] || i + 1}`,
      roomId: roomId,
      bedCode: `${roomNumber}-${letters[i] || i + 1}`,
      status: 'AVAILABLE'
    });
  }

  const newRoom: DBRoom = {
    id: roomId,
    propertyId: prop.id,
    roomNumber,
    roomType: roomType || 'DOUBLE',
    capacity: cap,
    hasAC: !!hasAC,
    monthlyRent: monthlyRent || 7500,
    deposit: deposit || monthlyRent || 7500,
    beds
  };

  prop.rooms.push(newRoom);
  res.status(201).json({ message: 'Room and individual beds added successfully', room: newRoom });
});

// Owner: Submit Property for Super Admin Verification
router.post('/:id/submit', authenticateJwt, requireRoles(['OWNER']), requireApprovedOwner, (req: AuthenticatedRequest, res: Response) => {
  const prop = db.properties.find(p => p.id === req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  if (prop.rooms.length === 0) {
    return res.status(400).json({ error: 'Property must have at least one room configuration before submitting.' });
  }

  prop.status = 'SUBMITTED';
  res.json({ message: 'Property submitted for Admin verification', property: prop });
});

export default router;

