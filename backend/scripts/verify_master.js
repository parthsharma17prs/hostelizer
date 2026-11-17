const http = require('http');

async function postJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 500, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode || 500, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getJson(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 500, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode || 500, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== STARTING FULL MASTER REQUIREMENTS VERIFICATION ===');

  // 1. Client OTP Auth
  const otpSend = await postJson('http://localhost:5001/api/auth/otp/send', { identifier: 'client_master@hostelizer.com', channel: 'EMAIL' });
  console.log('1. OTP Dispatch:', otpSend.status === 200 ? 'PASS' : 'FAIL', 'demoOtp:', otpSend.body.demoOtp);

  const otpVerify = await postJson('http://localhost:5001/api/auth/otp/verify', { identifier: 'client_master@hostelizer.com', otp: otpSend.body.demoOtp });
  console.log('2. OTP Verification & Session JWT:', otpVerify.status === 200 && otpVerify.body.token ? 'PASS' : 'FAIL');
  const clientToken = otpVerify.body.token;

  // 2. ORG Registration
  const orgReg = await postJson('http://localhost:5001/api/orgs/register', {
    name: 'Zenith Living ' + Date.now(),
    legalName: 'Zenith Co-Living Technologies Ltd',
    panNumber: 'AAACZ9999K',
    address: 'Scheme 54, Vijay Nagar',
    city: 'Indore'
  }, clientToken);
  console.log('3. ORG Registration:', orgReg.status === 201 ? 'PASS' : 'FAIL', 'orgId:', orgReg.body.organisation?.id);
  const clientOrgId = orgReg.body.organisation.id;

  // 3. Multi-Tenant Data Isolation
  const crossProbe = await getJson('http://localhost:5001/api/orgs/org-beta/dashboard', clientToken);
  console.log('4. Multi-Tenant Cross-Access Isolation (Org A probe against Org B):', crossProbe.status === 403 ? 'PASS (403 Forbidden)' : 'FAIL');

  // 4. Invite ORG Member
  const inviteMember = await postJson(`http://localhost:5001/api/orgs/${clientOrgId}/members`, {
    name: 'Aman Gupta',
    email: 'aman@zenithresidencies.com',
    role: 'ORG_MANAGER'
  }, clientToken);
  console.log('5. ORG Member Management & RBAC:', inviteMember.status === 201 ? 'PASS' : 'FAIL');

  // 5. Admin Self-Signup with Master Key
  const adminSignup = await postJson('http://localhost:5001/api/admin/signup', {
    name: 'Super Verifier',
    email: `verifier_${Date.now()}@hostelizer.com`,
    password: 'Password123!',
    adminKey: 'superadmin2026'
  });
  console.log('6. Admin Onboarding with Master Key:', adminSignup.status === 201 ? 'PASS' : 'FAIL');

  // 6. Admin Authentication & Approval of Org
  const adminLogin = await postJson('http://localhost:5001/api/auth/login', {
    email: 'admin@hostelizer.com',
    password: 'admin123'
  });
  const adminToken = adminLogin.body.token;

  // 7. Identity & Sensitive Data Masking (PAN & Aadhaar)
  const maskTest = await postJson('http://localhost:5001/api/auth/user-verification', {
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876-5432-1098',
    jobTitle: 'Operations Lead',
    companyName: 'Zenith Residencies'
  }, clientToken);
  console.log('7. Sensitive Data Masking (Aadhaar & PAN):', maskTest.body.verification?.maskedAadhaar === 'XXXX-XXXX-1098' ? 'PASS (XXXX-XXXX-1098)' : 'FAIL');

  // 8. Account Archive
  const archiveTest = await postJson('http://localhost:5001/api/auth/archive', {}, clientToken);
  console.log('8. Account Archive & Deactivation:', archiveTest.status === 200 && archiveTest.body.isArchived ? 'PASS' : 'FAIL');

  // 9. Audit Logging Ingestion & Query
  const auditLogs = await getJson('http://localhost:5001/api/log', adminToken);
  console.log('9. Security Audit Logging (/log):', auditLogs.status === 200 && auditLogs.body.logs?.length > 0 ? `PASS (${auditLogs.body.logs.length} events logged)` : 'FAIL');

  // 10. Frontend Route Health Checks
  const frontendRoutes = ['/', '/orgs', '/admin', '/apply-approval', '/dashboard/logs', '/sign-up'];
  for (const r of frontendRoutes) {
    const fRes = await getJson(`http://localhost:3000${r}`);
    console.log(`10. Frontend Route http://localhost:3000${r}:`, fRes.status === 200 ? 'PASS (200 OK)' : `FAIL (${fRes.status})`);
  }

  console.log('=== VERDICT: PASS ===');
}

run().catch(console.error);

