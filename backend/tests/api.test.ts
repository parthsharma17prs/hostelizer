import request from 'supertest';
import { app } from '../src/index';
import { db } from '../src/store/memoryStore';

describe('Hostelizer Core API & Business Rules Test Suite', () => {
  let customerToken: string;
  let ownerToken: string;
  let adminToken: string;
  let ownerProfileId: string;
  let createdPropId: string;
  let testRoomId: string;
  let testBedId: string;

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hostelizer.com', password: 'admin123' });
    adminToken = adminRes.body.token;

    // 2. Register fresh Customer
    const custRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Aman Verma',
        email: 'aman@test.com',
        phone: '9123456780',
        password: 'password123',
        role: 'CUSTOMER'
      });
    customerToken = custRes.body.token;

    // 3. Register fresh Owner
    const ownerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Vikas Patel',
        email: 'vikas@test.com',
        phone: '9822334455',
        password: 'password123',
        role: 'OWNER',
        businessName: 'Vikas Premier Hostels'
      });
    ownerToken = ownerRes.body.token;
    ownerProfileId = ownerRes.body.user.ownerProfileId;
  });

  test('RULE: Unapproved Owner CANNOT access owner dashboard or properties', async () => {
    const res = await request(app)
      .get('/api/owners/properties')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Approved verification is required');
  });

  test('RULE: Owner can submit verification documents and Admin can approve', async () => {
    // Owner applies
    const applyRes = await request(app)
      .post('/api/owners/apply')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        documents: [
          { type: 'AADHAAR', url: 'https://example.com/aadhaar.pdf' },
          { type: 'PROPERTY_TAX', url: 'https://example.com/tax.pdf' }
        ]
      });
    expect(applyRes.status).toBe(200);

    // Admin approves owner
    const approveRes = await request(app)
      .patch(`/api/admin/owner-applications/${ownerProfileId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.profile.status).toBe('APPROVED');

    // Relogin owner to obtain refreshed token with APPROVED status
    const reloginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vikas@test.com', password: 'password123' });
    ownerToken = reloginRes.body.token;
  });

  test('RULE: Approved Owner can create Property Listing in DRAFT status', async () => {
    const propRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Vikas Elite Boys Hostel',
        city: 'Indore',
        locality: 'Bhawarkua',
        genderPreference: 'BOYS',
        monthlyRentStarting: 7000,
        foodIncluded: true,
        amenities: ['Wi-Fi', 'AC', 'Meals Included']
      });

    expect(propRes.status).toBe(201);
    expect(propRes.body.property.status).toBe('DRAFT');
    createdPropId = propRes.body.property.id;
  });

  test('RULE: Adding room automatically provisions individual bed inventory', async () => {
    const roomRes = await request(app)
      .post(`/api/properties/${createdPropId}/rooms`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        roomNumber: '101',
        roomType: 'DOUBLE',
        capacity: 2,
        hasAC: true,
        monthlyRent: 8000
      });

    expect(roomRes.status).toBe(201);
    expect(roomRes.body.room.beds.length).toBe(2);
    expect(roomRes.body.room.beds[0].bedCode).toBe('101-A');
    expect(roomRes.body.room.beds[1].bedCode).toBe('101-B');

    testRoomId = roomRes.body.room.id;
    testBedId = roomRes.body.room.beds[0].id;
  });

  test('RULE: Submitting property moves it to SUBMITTED and Admin publishes it', async () => {
    // Owner submits
    const submitRes = await request(app)
      .post(`/api/properties/${createdPropId}/submit`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.property.status).toBe('SUBMITTED');

    // Admin approves & publishes
    const pubRes = await request(app)
      .patch(`/api/admin/property-approvals/${createdPropId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.property.status).toBe('PUBLISHED');
  });

  test('RULE: Customer can book bed & duplicate booking of same bed is REJECTED', async () => {
    // 1st Booking (Succeeds)
    const bookRes1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        propertyId: createdPropId,
        roomId: testRoomId,
        bedId: testBedId
      });
    expect(bookRes1.status).toBe(201);
    expect(bookRes1.body.booking.status).toBe('CONFIRMED');

    // 2nd Booking for the exact same bed (Must fail with 409 Conflict)
    const bookRes2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        propertyId: createdPropId,
        roomId: testRoomId,
        bedId: testBedId
      });
    expect(bookRes2.status).toBe(409);
    expect(bookRes2.body.error).toContain('already OCCUPIED');
  });

  test('AI Service: Natural Language query parsing converts text to structured filters', async () => {
    const aiRes = await request(app)
      .post('/api/ai/parse-search')
      .send({ query: 'Find boys PG near Vijay Nagar Indore below 8000 with food and AC' });

    expect(aiRes.status).toBe(200);
    expect(aiRes.body.parsedFilters.gender_preference).toBe('BOYS');
    expect(aiRes.body.parsedFilters.city).toBe('Indore');
    expect(aiRes.body.parsedFilters.food_included).toBe(true);
    expect(aiRes.body.parsedFilters.has_ac).toBe(true);
    expect(aiRes.body.parsedFilters.max_budget).toBe(8000);
  });
});

