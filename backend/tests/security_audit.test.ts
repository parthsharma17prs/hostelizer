import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import { db } from '../src/store/memoryStore';

describe('Hostelizer Gravitas Security & Loophole Audit Test Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev';

  // -------------------------------------------------------------------------
  // 1. REPLAY ATTACK & OTP INVARIANCE
  // -------------------------------------------------------------------------
  test('SECURITY: OTP cannot be replayed after successful verification', async () => {
    const testPhone = '+919999888877';

    // 1. Request OTP
    const sendRes = await request(app)
      .post('/api/auth/otp/send')
      .send({ identifier: testPhone, channel: 'SMS' });
    expect(sendRes.status).toBe(200);
    const code = sendRes.body.demoOtp;
    expect(code).toBeDefined();

    // 2. First verification (legitimate) -> MUST SUCCEED (200)
    const verify1 = await request(app)
      .post('/api/auth/otp/verify')
      .send({ identifier: testPhone, otp: code, role: 'CUSTOMER' });
    expect(verify1.status).toBe(200);
    expect(verify1.body.token).toBeDefined();

    // 3. Second verification (replay attack with same code) -> MUST FAIL (400)
    const verify2 = await request(app)
      .post('/api/auth/otp/verify')
      .send({ identifier: testPhone, otp: code, role: 'CUSTOMER' });
    expect(verify2.status).toBe(400);
    expect(verify2.body.error).toContain('No OTP requested for this number/email, or OTP has expired');
  });

  // -------------------------------------------------------------------------
  // 2. BRUTE-FORCE RATE LIMITING ON OTP
  // -------------------------------------------------------------------------
  test('SECURITY: OTP is permanently invalidated after 5 failed brute-force attempts', async () => {
    const targetPhone = '+917777666655';

    // Request OTP
    const sendRes = await request(app)
      .post('/api/auth/otp/send')
      .send({ identifier: targetPhone, channel: 'SMS' });
    expect(sendRes.status).toBe(200);
    const correctCode = sendRes.body.demoOtp;

    // Send 5 incorrect attempts
    for (let i = 1; i <= 5; i++) {
      const failRes = await request(app)
        .post('/api/auth/otp/verify')
        .send({ identifier: targetPhone, otp: '000000', role: 'CUSTOMER' });
      expect(failRes.status).toBe(401);
    }

    // 6th attempt with ANY code (even correct code!) -> MUST BE BLOCKED BY RATE LIMITER (429)
    const lockedRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ identifier: targetPhone, otp: correctCode, role: 'CUSTOMER' });
    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error).toContain('Maximum verification attempts exceeded');
  });

  // -------------------------------------------------------------------------
  // 3. PRIVILEGE ESCALATION ATTEMPT IN REGISTRATION
  // -------------------------------------------------------------------------
  test('SECURITY: Registration request attempting role: ADMIN must be denied/coerced to CUSTOMER', async () => {
    const rogueEmail = `hacker_${Date.now()}@darknet.io`;

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Evil Hacker',
        email: rogueEmail,
        phone: '9988776655',
        password: 'SuperSecurePassword123!',
        role: 'ADMIN' // Malicious attempt to elevate privileges
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CUSTOMER'); // Must be coerced to CUSTOMER

    // Check user in database
    const storedUser = db.users.find(u => u.email === rogueEmail);
    expect(storedUser?.role).toBe('CUSTOMER');
  });

  // -------------------------------------------------------------------------
  // 4. CRYPTOGRAPHIC SIGNATURE TAMPERING & FORGERY
  // -------------------------------------------------------------------------
  test('SECURITY: Forged JWT token signed with rogue secret must be rejected with 401', async () => {
    // Attacker crafts token pretending to be Super Admin
    const forgedToken = jwt.sign(
      { id: 'admin-1', email: 'admin@hostelizer.com', role: 'ADMIN' },
      'attacker-rogue-secret-key-12345',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/admin/owner-applications')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid or expired token');
  });

  // -------------------------------------------------------------------------
  // 5. ANTI-BYPASS & LIVE REVOCATION CHECK ON UNAPPROVED OWNERS
  // -------------------------------------------------------------------------
  test('SECURITY: Unapproved Owner CANNOT access protected resources even with valid token', async () => {
    // Register owner
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Unverified Landlord',
        email: `unverified_${Date.now()}@hostel.in`,
        phone: '9811223344',
        password: 'OwnerPassword123!',
        role: 'OWNER'
      });
    const ownerToken = regRes.body.token;

    // Try accessing properties before admin verification
    const propRes = await request(app)
      .get('/api/owners/properties')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(propRes.status).toBe(403);
    expect(propRes.body.error).toContain('Approved verification is required');
  });

  // -------------------------------------------------------------------------
  // 6. HARDCODED MASTER PASSWORD DEFENSE
  // -------------------------------------------------------------------------
  test('SECURITY: Newly registered user CANNOT be logged into using master password "admin123"', async () => {
    const userEmail = `citizen_${Date.now()}@normal.com`;

    // 1. Register with real password
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Regular Citizen',
        email: userEmail,
        phone: '9876543299',
        password: 'RealPrivatePassword99!',
        role: 'CUSTOMER'
      });

    // 2. Attacker attempts to login with 'admin123' -> MUST FAIL (401)
    const attackRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: 'admin123'
      });

    expect(attackRes.status).toBe(401);
    expect(attackRes.body.error).toContain('Invalid email or credentials');
  });

  // -------------------------------------------------------------------------
  // 7. INPUT VALIDATION & INJECTION RESISTANCE
  // -------------------------------------------------------------------------
  test('SECURITY: Non-string parameter injection returns 400 Bad Request', async () => {
    // Attacker passes NoSQL-like object filter instead of string
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $ne: null },
        password: 'password123'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Valid email and password strings are required');
  });
});

