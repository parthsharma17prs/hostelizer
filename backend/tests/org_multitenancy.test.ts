import request from 'supertest';
import { app } from '../src/index';
import { db } from '../src/store/memoryStore';

describe('Hostelizer Organisation (ORG) & Multi-Tenancy Architecture Test Suite', () => {
  let adminToken: string;
  let ownerTokenA: string;
  let ownerTokenB: string;
  let orgIdA: string;
  let orgIdB: string;

  beforeAll(async () => {
    // 1. Authenticate Super Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hostelizer.com', password: 'admin123' });
    adminToken = adminRes.body.token;

    // 2. Register Owner A (for Organisation Alpha)
    const ownerARes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alpha CEO',
        email: `ceo_alpha_${Date.now()}@apexhostels.com`,
        phone: '9888811111',
        password: 'Password123!',
        role: 'OWNER'
      });
    ownerTokenA = ownerARes.body.token;

    // 3. Register Owner B (for Organisation Beta)
    const ownerBRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Beta CEO',
        email: `ceo_beta_${Date.now()}@horizonstays.com`,
        phone: '9888822222',
        password: 'Password123!',
        role: 'OWNER'
      });
    ownerTokenB = ownerBRes.body.token;
  });

  // -------------------------------------------------------------------------
  // 1. ORGANISATION REGISTRATION & ONBOARDING
  // -------------------------------------------------------------------------
  test('ORG: Owner A can register Organisation Alpha', async () => {
    const res = await request(app)
      .post('/api/orgs/register')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        name: 'Apex Grand Residencies',
        legalName: 'Apex Grand Hospitality Pvt Ltd',
        panNumber: 'AAACA9999Z',
        gstNumber: '23AAACA9999Z1Z5',
        address: 'Sector 54, Main Road',
        city: 'Indore',
        domain: 'apexgrand.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.organisation.name).toBe('Apex Grand Residencies');
    expect(res.body.organisation.status).toBe('PENDING');
    orgIdA = res.body.organisation.id;
  });

  test('ORG: Owner B can register Organisation Beta', async () => {
    const res = await request(app)
      .post('/api/orgs/register')
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({
        name: 'Horizon Elite Living',
        legalName: 'Horizon Elite Co-Living LLP',
        panNumber: 'BBBCB8888Y',
        address: 'Cyber Hub Phase 2',
        city: 'Gurgaon'
      });

    expect(res.status).toBe(201);
    orgIdB = res.body.organisation.id;
  });

  // -------------------------------------------------------------------------
  // 2. MULTI-TENANT DATA ISOLATION (ORG A CANNOT ACCESS ORG B)
  // -------------------------------------------------------------------------
  test('TENANT ISOLATION: Owner A CANNOT access Organisation Beta data (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/orgs/${orgIdB}`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Tenant Isolation');
  });

  test('TENANT ISOLATION: Super Admin can access all organisations', async () => {
    const resA = await request(app)
      .get(`/api/orgs/${orgIdA}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resA.status).toBe(200);

    const resB = await request(app)
      .get(`/api/orgs/${orgIdB}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resB.status).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 3. ORGANISATION MEMBER MANAGEMENT & RBAC
  // -------------------------------------------------------------------------
  test('ORG MEMBERS: Org Admin can invite manager and staff to their organisation', async () => {
    const res = await request(app)
      .post(`/api/orgs/${orgIdA}/members`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        name: 'Karan Sharma',
        email: 'karan@apexgrand.com',
        role: 'ORG_MANAGER'
      });

    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe('ORG_MANAGER');
    expect(res.body.organisation.members.length).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // 4. SUPER ADMIN APPROVAL WORKFLOW FOR ORGANISATION
  // -------------------------------------------------------------------------
  test('ADMIN APPROVAL: Super Admin can approve Organisation Alpha', async () => {
    const res = await request(app)
      .patch(`/api/admin/orgs/${orgIdA}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.organisation.status).toBe('APPROVED');
  });

  // -------------------------------------------------------------------------
  // 5. AUDIT LOGGING & DASHBOARD LOGS (/log & /api/logs)
  // -------------------------------------------------------------------------
  test('LOGS: Ingestion and retrieval of activity logs', async () => {
    // 1. Ingest event
    const logRes = await request(app)
      .post('/api/log')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        action: 'PROPERTY_INSPECT',
        resource: 'PROPERTY',
        status: 'SUCCESS',
        details: 'Inspected safety & biometric gates',
        orgId: orgIdA,
        orgName: 'Apex Grand Residencies'
      });
    expect(logRes.status).toBe(201);

    // 2. Query logs
    const getLogsRes = await request(app)
      .get('/api/log')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getLogsRes.status).toBe(200);
    expect(getLogsRes.body.logs.length).toBeGreaterThanOrEqual(1);
    expect(getLogsRes.body.logs[0].action).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 6. IDENTITY & SENSITIVE DATA MASKING (AADHAAR & PAN)
  // -------------------------------------------------------------------------
  test('VERIFICATION: Aadhaar and PAN are masked to prevent plaintext leakage', async () => {
    const res = await request(app)
      .post('/api/auth/user-verification')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        aadhaarNumber: '1234-5678-9876',
        panNumber: 'ABCDE1234F',
        jobTitle: 'Regional Property Director',
        companyName: 'Apex Grand Hospitality Pvt Ltd'
      });

    expect(res.status).toBe(200);
    expect(res.body.verification.maskedAadhaar).toBe('XXXX-XXXX-9876');
    expect(res.body.verification.maskedPan).toBe('ABXXX4F');
  });

  // -------------------------------------------------------------------------
  // 7. ACCOUNT ARCHIVAL FUNCTIONALITY
  // -------------------------------------------------------------------------
  test('ARCHIVE: Client or Org owner can archive account, revoking access', async () => {
    const res = await request(app)
      .post('/api/auth/archive')
      .set('Authorization', `Bearer ${ownerTokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
    expect(res.body.message).toContain('Account successfully archived');
  });
});

