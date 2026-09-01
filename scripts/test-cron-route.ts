import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/cron/alfa/route';

async function testRoute() {
  console.log('--- Testing /api/cron/alfa Route Handler Security & Responses ---');
  process.env.CRON_SECRET = 'p3k-cron-secret-key-2026-alfa-auto-gen';
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production'; // Enforce strict auth check


  // 1. Unauthorized GET request
  const unauthReq = new NextRequest('http://localhost:3000/api/cron/alfa');
  const unauthRes = await GET(unauthReq);
  console.log('Unauth GET status:', unauthRes.status);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }

  // 2. Authorized GET request (Bearer token)
  const authReq = new NextRequest('http://localhost:3000/api/cron/alfa?date=2029-01-06', {
    headers: {
      authorization: 'Bearer p3k-cron-secret-key-2026-alfa-auto-gen',
    },
  });
  const authRes = await GET(authReq);
  console.log('Auth GET status:', authRes.status);
  const authJson = await authRes.json();
  console.log('Auth GET body:', JSON.stringify(authJson, null, 2));
  if (authRes.status !== 200 || !authJson.success) {
    throw new Error(`Expected 200 OK, got ${authRes.status}`);
  }

  // 3. Authorized POST request (x-cron-secret header)
  const postReq = new NextRequest('http://localhost:3000/api/cron/alfa', {
    method: 'POST',
    headers: {
      'x-cron-secret': 'p3k-cron-secret-key-2026-alfa-auto-gen',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      date: '2029-01-06',
    }),
  });
  const postRes = await POST(postReq);
  console.log('Auth POST status:', postRes.status);
  const postJson = await postRes.json();
  console.log('Auth POST body:', JSON.stringify(postJson, null, 2));
  if (postRes.status !== 200 || !postJson.success) {
    throw new Error(`Expected 200 OK, got ${postRes.status}`);
  }

  console.log('\n[PASS] Route Handler authorization and response verified successfully!');
}

testRoute().catch((err) => {
  console.error(err);
  process.exit(1);
});
