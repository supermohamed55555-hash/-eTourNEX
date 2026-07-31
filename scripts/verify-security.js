const fs = require('fs');
const http = require('http');

// Helper to make local HTTP requests to the Next.js dev server running on port 3000
function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function runVerification() {
  console.log("=== eTourNEX Automated Security & Flow Verification ===\n");

  // Test HTTP-level security enforcement against the running Supabase-backed app
  try {
    // 1. HTTP GET /admin as unauthenticated visitor
    console.log("--- TEST 1: Unauthenticated GET /admin ---");
    const resAdminAnon = await makeRequest('/admin');
    console.log(`HTTP Status: ${resAdminAnon.statusCode}`);
    console.log(`Contains Admin Access Required: ${resAdminAnon.body.includes('Admin Access Required')}`);
    console.log("-------------------------------------------\n");

  } catch (err) {
    console.error("HTTP Request Error:", err.message);
  }
}

runVerification();
