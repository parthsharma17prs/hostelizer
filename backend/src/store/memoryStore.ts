// In-memory data store for local dev & testing when PostgreSQL container is not spun up yet
// Easily swappable with Prisma Client

export interface DBUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'VERIFICATION_ADMIN';
  authProvider?: 'LOCAL' | 'GOOGLE' | 'OTP';
  ownerStatus?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SUSPENDED';
  createdAt: Date;
}

export interface DBOwnerProfile {
  id: string;
  userId: string;
  businessName: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SUSPENDED';
  rejectionReason?: string;
  reviewedBy?: string;
  documents: { id: string; type: string; url: string; verified: boolean }[];
  createdAt: Date;
}

export interface DBProperty {
  id: string;
  ownerProfileId: string;
  name: string;
  description: string;
  genderPreference: 'BOYS' | 'GIRLS' | 'COED';
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  address: string;
  city: string;
  locality: string;
  pincode: string;
  latitude: number;
  longitude: number;
  monthlyRentStarting: number;
  foodIncluded: boolean;
  amenities: string[];
  images: { id: string; url: string; isCover: boolean; category: string }[];
  rooms: DBRoom[];
  createdAt: Date;
}

export interface DBRoom {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomType: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'FOUR_SHARING';
  capacity: number;
  hasAC: boolean;
  monthlyRent: number;
  deposit: number;
  beds: DBBed[];
}

export interface DBBed {
  id: string;
  roomId: string;
  bedCode: string;
  status: 'AVAILABLE' | 'HELD' | 'OCCUPIED' | 'MAINTENANCE';
  heldUntil?: Date;
}

export interface DBBooking {
  id: string;
  customerId: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  startDate: Date;
  status: 'REQUESTED' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
  monthlyRent: number;
  tokenPaid: number;
  createdAt: Date;
}

export interface DBVisit {
  id: string;
  customerId: string;
  propertyId: string;
  preferredDate: string;
  timeSlot: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
}

export interface DBLead {
  id: string;
  ownerProfileId: string;
  propertyId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: 'NEW_ENQUIRY' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'INTERESTED' | 'CONVERTED' | 'LOST';
  notes?: string;
  createdAt: Date;
}

class MemoryStore {
  users: DBUser[] = [];
  ownerProfiles: DBOwnerProfile[] = [];
  properties: DBProperty[] = [];
  bookings: DBBooking[] = [];
  visits: DBVisit[] = [];
  leads: DBLead[] = [];

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed Admin
    this.users.push({
      id: 'admin-1',
      name: 'Super Admin',
      email: 'admin@hostelizer.com',
      phone: '9999999999',
      passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h', // 'admin123'
      role: 'ADMIN',
      createdAt: new Date()
    });

    // Seed Owner
    const ownerUserId = 'owner-1';
    this.users.push({
      id: ownerUserId,
      name: 'Rajesh Sharma',
      email: 'rajesh@sunrisehostels.com',
      phone: '9876543210',
      passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h', // 'admin123'
      role: 'OWNER',
      createdAt: new Date()
    });

    const ownerProfileId = 'owner-profile-1';
    this.ownerProfiles.push({
      id: ownerProfileId,
      userId: ownerUserId,
      businessName: 'Sunrise Co-Living & Hostels',
      status: 'APPROVED',
      documents: [
        { id: 'doc-1', type: 'PAN', url: 'https://placehold.co/600x400/png?text=Owner+PAN', verified: true },
        { id: 'doc-2', type: 'PROPERTY_TAX', url: 'https://placehold.co/600x400/png?text=Tax+Receipt', verified: true }
      ],
      createdAt: new Date()
    });

    // Seed Published Property 1
    const prop1Id = 'prop-1';
    const room1Id = 'room-101';
    const room2Id = 'room-102';

    this.properties.push({
      id: prop1Id,
      ownerProfileId: ownerProfileId,
      name: 'Sunrise Luxury Boys PG & Co-living',
      description: 'Premium boys accommodation equipped with AC, high-speed Wi-Fi, nutritious North & South Indian meals, laundry and 24/7 security near major coaching hubs.',
      genderPreference: 'BOYS',
      status: 'PUBLISHED',
      address: 'Plot 42, Scheme 54, Near Vijay Nagar Square',
      city: 'Indore',
      locality: 'Vijay Nagar',
      pincode: '452010',
      latitude: 22.7533,
      longitude: 75.8937,
      monthlyRentStarting: 7500,
      foodIncluded: true,
      amenities: ['Wi-Fi', 'Air Conditioning', 'Meals Included', 'CCTV Security', 'Power Backup', 'Housekeeping', 'Laundry'],
      images: [
        { id: 'img-1', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80', isCover: true, category: 'ROOM' },
        { id: 'img-2', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', isCover: false, category: 'ROOM' },
        { id: 'img-3', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', isCover: false, category: 'WASHROOM' }
      ],
      rooms: [
        {
          id: room1Id,
          propertyId: prop1Id,
          roomNumber: '101',
          roomType: 'DOUBLE',
          capacity: 2,
          hasAC: true,
          monthlyRent: 8500,
          deposit: 8500,
          beds: [
            { id: 'bed-101-A', roomId: room1Id, bedCode: '101-A', status: 'AVAILABLE' },
            { id: 'bed-101-B', roomId: room1Id, bedCode: '101-B', status: 'OCCUPIED' }
          ]
        },
        {
          id: room2Id,
          propertyId: prop1Id,
          roomNumber: '102',
          roomType: 'TRIPLE',
          capacity: 3,
          hasAC: false,
          monthlyRent: 6500,
          deposit: 6500,
          beds: [
            { id: 'bed-102-A', roomId: room2Id, bedCode: '102-A', status: 'AVAILABLE' },
            { id: 'bed-102-B', roomId: room2Id, bedCode: '102-B', status: 'AVAILABLE' },
            { id: 'bed-102-C', roomId: room2Id, bedCode: '102-C', status: 'OCCUPIED' }
          ]
        }
      ],
      createdAt: new Date()
    });

    // Seed Published Property 2 (Bangalore)
    const prop2Id = 'prop-2';
    const room3Id = 'room-201';
    this.properties.push({
      id: prop2Id,
      ownerProfileId: ownerProfileId,
      name: 'Stanza Prime Girls Co-living & Hostel',
      description: 'Modern, safe girls living space near Sony World Signal with biometric access, gym, Wi-Fi, and daily housekeeping.',
      genderPreference: 'GIRLS',
      status: 'PUBLISHED',
      address: '8th Main, 4th Block, Koramangala',
      city: 'Bangalore',
      locality: 'Koramangala',
      pincode: '560034',
      latitude: 12.9352,
      longitude: 77.6245,
      monthlyRentStarting: 11000,
      foodIncluded: true,
      amenities: ['Wi-Fi', 'Air Conditioning', 'Meals Included', 'Gym', 'Biometric Entry', 'Power Backup'],
      images: [
        { id: 'img-4', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80', isCover: true, category: 'ROOM' },
        { id: 'img-5', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', isCover: false, category: 'COMMON_AREA' }
      ],
      rooms: [
        {
          id: room3Id,
          propertyId: prop2Id,
          roomNumber: '201',
          roomType: 'DOUBLE',
          capacity: 2,
          hasAC: true,
          monthlyRent: 12500,
          deposit: 15000,
          beds: [
            { id: 'bed-201-A', roomId: room3Id, bedCode: '201-A', status: 'AVAILABLE' },
            { id: 'bed-201-B', roomId: room3Id, bedCode: '201-B', status: 'AVAILABLE' }
          ]
        }
      ],
      createdAt: new Date()
    });
  }
}

export const db = new MemoryStore();

