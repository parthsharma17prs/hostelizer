/**
 * Verification Script for Authentication, Login & KYC Validation (/api/v1)
 */

const BASE_URL = 'http://localhost:5001/api/v1';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const body = await res.json();
  return { status: res.status, body };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function run() {
  console.log('🚀 Starting Verification of Auth, Login & KYC Modules (/api/v1)...');

  // 1. Root & Envelope Check
  console.log('\n--- 1. Root /api/v1 Check ---');
  const root = await request('/');
  assert(root.status === 200, `Root status ${root.status}`);
  assert(root.body.success === true, 'Envelope success must be true');
  assert(root.body.meta?.requestId, 'Meta must contain requestId');
  assert(root.body.data.modules.length === 2, 'Auth & KYC modules active');
  console.log('✅ /api/v1 root and envelope validated.');

  // 2. Module 1: Auth & Login (OTP & Sessions)
  console.log('\n--- 2. Module 1: Auth & Login ---');
  const otpSend = await request('/auth/otp/send', {
    method: 'POST',
    body: { phone: '+919876543210', purpose: 'SIGN_IN' }
  });
  assert(otpSend.status === 202, `OTP send status ${otpSend.status}`);
  assert(otpSend.body.data.challengeId, 'Received challengeId');
  const challengeId = otpSend.body.data.challengeId;

  const otpVerify = await request('/auth/otp/verify', {
    method: 'POST',
    body: { challengeId, code: '482913' }
  });
  assert(otpVerify.status === 200, `OTP verify status ${otpVerify.status}`);
  assert(otpVerify.body.data.accessToken, 'Received accessToken');
  const token = otpVerify.body.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const me = await request('/me', { headers: authHeaders });
  assert(me.status === 200, `GET /me status ${me.status}`);
  assert(me.body.data.id, 'User ID returned');
  assert(me.body.data.capabilities, 'Capabilities returned');

  const profile = await request('/me/profile', { headers: authHeaders });
  assert(profile.status === 200, `GET /me/profile status ${profile.status}`);

  const updateProfile = await request('/me/profile', {
    method: 'PATCH',
    headers: authHeaders,
    body: { fullName: 'Rajesh Sharma Verified' }
  });
  assert(updateProfile.status === 200, `PATCH /me/profile status ${updateProfile.status}`);
  assert(updateProfile.body.data.fullName === 'Rajesh Sharma Verified', 'Profile updated');

  const sessions = await request('/me/sessions', { headers: authHeaders });
  assert(sessions.status === 200, `GET /me/sessions status ${sessions.status}`);
  assert(Array.isArray(sessions.body.data), 'Sessions array returned');
  console.log('✅ Auth, OTP & Session endpoints validated.');

  // 3. KYC Onboarding & Dossier Intake
  console.log('\n--- 3. KYC Onboarding & Dossier Intake ---');
  const applyKyc = await request('/kyc/apply', {
    method: 'POST',
    headers: authHeaders,
    body: {
      businessName: 'Sunrise Co-Living & Hostels',
      ownerName: 'Rajesh Sharma Verified',
      contactNumber: '+919876543210',
      propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
      city: 'Indore',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '9876-5432-1098',
      bankAccountNumber: '98765432109876',
      ifscCode: 'HDFC0001234',
      documents: [
        { type: 'PAN_CARD', label: 'Owner PAN Card', url: 'https://res.cloudinary.com/demo/pan.pdf' },
        { type: 'PROPERTY_DEED', label: 'Property Ownership Deed', url: 'https://res.cloudinary.com/demo/deed.pdf' },
        { type: 'AADHAAR', label: 'Aadhaar Identity Card', url: 'https://res.cloudinary.com/demo/aadhaar.pdf' }
      ]
    }
  });
  assert(applyKyc.status === 201, `KYC apply status ${applyKyc.status}`);
  assert(applyKyc.body.data.status === 'UNDER_REVIEW', 'Status set to UNDER_REVIEW');
  assert(applyKyc.body.data.slaHours === 48, '48h SLA confirmed');
  const applicationId = applyKyc.body.data.applicationId;

  // 4. Caller KYC Status Check
  console.log('\n--- 4. Caller KYC Status Check ---');
  const kycStatus = await request('/kyc/status', { headers: authHeaders });
  assert(kycStatus.status === 200, `KYC status check ${kycStatus.status}`);
  assert(kycStatus.body.data.status === 'UNDER_REVIEW', 'Status is UNDER_REVIEW');
  assert(kycStatus.body.data.dossier.panNumber === 'ABCDE1234F', 'PAN matches');
  console.log('✅ KYC submission and status retrieval validated.');

  // 5. Super Admin Review & Approval Queue
  console.log('\n--- 5. Super Admin Review & Approval ---');
  const jwt = require('jsonwebtoken');
  const adminToken = jwt.sign(
    { id: 'usr_admin_01', email: 'admin@hostelizer.com', role: 'SUPER_ADMIN' },
    process.env.JWT_SECRET || 'super-secret-jwt-key-hostelizer-dev',
    { expiresIn: '15m' }
  );
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const adminList = await request('/admin/kyc/applications', { headers: adminHeaders });
  assert(adminList.status === 200, `Admin list status ${adminList.status}`);
  assert(adminList.body.data.applications.length >= 1, 'Application visible in admin queue');

  const approveKyc = await request('/admin/kyc/approve', {
    method: 'POST',
    headers: adminHeaders,
    body: { applicationId }
  });
  assert(approveKyc.status === 200, `Admin approve status ${approveKyc.status}`);
  assert(approveKyc.body.data.status === 'APPROVED', 'Application marked APPROVED');

  // Verify updated status on caller side
  const updatedStatus = await request('/kyc/status', { headers: authHeaders });
  assert(updatedStatus.body.data.status === 'APPROVED', 'Owner status updated to APPROVED');
  console.log('✅ Super Admin review and approval workflow validated.');

  console.log('\n======================================================');
  console.log('🎉 AUTH, LOGIN & KYC MODULE VERIFICATION SUCCEEDED!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
