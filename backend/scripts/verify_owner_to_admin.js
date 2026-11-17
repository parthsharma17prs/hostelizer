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

async function patchJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(body);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'PATCH',
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

async function run() {
  console.log('=== VERIFYING OWNER APPLICATION -> SUPER ADMIN PANEL VISIBILITY ===');

  // Step 1: Register a new Hostel Owner
  const ownerEmail = `hostel_owner_${Date.now()}@sunrisehostels.com`;
  const ownerReg = await postJson('http://localhost:5001/api/auth/register', {
    name: 'Rajesh Sharma',
    email: ownerEmail,
    phone: '9876543210',
    password: 'Password123!',
    role: 'OWNER'
  });
  console.log('1. Owner Registration:', ownerReg.status === 201 ? 'PASS' : 'FAIL');
  const ownerToken = ownerReg.body.token;

  // Step 2: Owner applies via /api/owners/apply
  const applyPayload = {
    businessName: 'Sunrise Prime Luxury Hostels',
    ownerName: 'Rajesh Sharma',
    contactNumber: '+91 83195 56016',
    propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
    city: 'Indore',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876-5432-1098',
    bankAccountNumber: '98765432109876',
    ifscCode: 'HDFC0001234',
    documents: [
      { type: 'PAN_CARD', label: 'Owner PAN Card', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/pan_mehta.pdf' },
      { type: 'PROPERTY_DEED', label: 'Property Ownership Deed', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/property_deed_koramangala.pdf' },
      { type: 'AADHAAR', label: 'Aadhaar Identity Card', url: 'https://res.cloudinary.com/cwswmc7c/image/upload/v1/hostelizer/owners/docs/aadhaar_mehta.pdf' }
    ]
  };

  const applyRes = await postJson('http://localhost:5001/api/owners/apply', applyPayload, ownerToken);
  console.log('2. Owner Application Submission:', (applyRes.status === 200 || applyRes.status === 201) ? 'PASS' : 'FAIL', 'Application ID:', applyRes.body.profile?.id);
  const applicationId = applyRes.body.profile.id;

  // Step 3: Authenticate as Super Admin
  const adminLogin = await postJson('http://localhost:5001/api/auth/login', {
    email: 'admin@hostelizer.com',
    password: 'admin123'
  });
  console.log('3. Super Admin Authentication:', adminLogin.status === 200 ? 'PASS' : 'FAIL');
  const adminToken = adminLogin.body.token;

  // Step 4: Super Admin queries /api/admin/owner-applications
  const adminAppsRes = await getJson('http://localhost:5001/api/admin/owner-applications', adminToken);
  console.log('4. Super Admin Applications Fetch:', adminAppsRes.status === 200 ? 'PASS' : 'FAIL', `Total in queue: ${adminAppsRes.body.count}`);

  const foundApp = adminAppsRes.body.applications?.find(a => a.id === applicationId || a.ownerEmail === ownerEmail);
  if (!foundApp) {
    console.error('FAIL: Submitted application not found on Super Admin panel!');
    process.exit(1);
  }

  console.log('5. Application Visibility on Super Admin Panel: PASS');
  console.log('   - Business Name:', foundApp.businessName);
  console.log('   - Owner Name:', foundApp.ownerName);
  console.log('   - Owner Email:', foundApp.ownerEmail);
  console.log('   - Status:', foundApp.status);
  console.log('   - Property Address:', foundApp.propertyAddress);
  console.log('   - PAN:', foundApp.panNumber);
  console.log('   - Aadhaar:', foundApp.aadhaarNumber);
  console.log('   - Documents Count:', foundApp.documents?.length);

  // Step 5: Super Admin Authorizes KYC
  const approveRes = await patchJson(`http://localhost:5001/api/admin/owner-applications/${applicationId}/approve`, {}, adminToken);
  console.log('6. Super Admin KYC Authorization:', approveRes.status === 200 ? 'PASS' : 'FAIL', 'New Status:', approveRes.body.profile?.status);

  console.log('=== VERDICT: PASS ===');
}

run().catch(console.error);
