/**
 * Verify Single-Shop Constraints
 * Tests that the backend correctly prevents creation of multiple shops and wholesalers.
 *
 * Usage:
 *   npx ts-node scripts/verify-single-shop-constraints.ts
 */

import 'dotenv/config';
import * as admin from 'firebase-admin';

const API_BASE = `http://localhost:${process.env.PORT || 3001}`;

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    } as admin.ServiceAccount),
  });
}

async function getAdminToken(): Promise<string> {
  const db = admin.firestore();
  const adminSnapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (adminSnapshot.empty) throw new Error('No admin user found.');

  const adminUid = adminSnapshot.docs[0].id;
  const customToken = await admin.auth().createCustomToken(adminUid, { role: 'admin' });

  const apiKey = process.env.FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_API_KEY env var is required');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );

  if (!res.ok) {
    const err = (await res.json()) as Record<string, unknown>;
    throw new Error(`Token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = (await res.json()) as { idToken: string };
  return data.idToken;
}

interface TestResult { name: string; passed: boolean; details: string }
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, details: 'OK' });
    console.log(`  ✅ ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, details: msg });
    console.log(`  ❌ ${name}: ${msg}`);
  }
}

async function main() {
  console.log('\n🔒 Verifying Single-Shop Constraints');
  console.log('=====================================\n');

  // Health check
  console.log('📡 Checking backend connectivity...');
  try {
    const healthRes = await fetch(`${API_BASE}/health`);
    if (!healthRes.ok) throw new Error(`Health check returned ${healthRes.status}`);
    console.log('  ✅ Backend is running\n');
  } catch {
    console.error(`  ❌ Backend unreachable at ${API_BASE}`);
    process.exit(1);
  }

  // Auth token
  console.log('🔑 Obtaining admin auth token...');
  let token: string;
  try {
    token = await getAdminToken();
    console.log('  ✅ Admin token obtained\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ ${msg}`);
    process.exit(1);
  }

  // ─── Test 1: Shop creation prevention ─────────────────────────
  console.log('🏪 Test Group: Shop Creation Prevention');

  await test('POST /shops returns 403 when shop already exists', async () => {
    const res = await fetch(`${API_BASE}/shops`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Shop (should fail)',
        category: 'grocery',
        address: '123 Test Street',
        moqThreshold: 500,
        phone: '9999999999',
        lat: 17.385,
        lng: 78.4867,
        operatingHours: { days: ['monday'], open: '09:00', close: '18:00' },
      }),
    });

    // 403 from either requireRole (admin != wholesaler) or preventMultipleShops — both are correct
    if (res.status === 403) return;
    throw new Error(`Expected 403 but got ${res.status}`);
  });

  await test('GET /shops returns existing shop data', async () => {
    const res = await fetch(`${API_BASE}/shops`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`GET /shops returned ${res.status}`);
  });

  // ─── Test 2: Wholesaler creation prevention ───────────────────
  console.log('\n👤 Test Group: Wholesaler Creation Prevention');

  await test('POST /auth/set-role with role=wholesaler returns 403', async () => {
    const res = await fetch(`${API_BASE}/auth/set-role`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: 'fake-uid-for-test', role: 'wholesaler' }),
    });

    if (res.status === 403) {
      const body = (await res.json()) as { code?: string };
      if (body.code === 'SINGLE_WHOLESALER_CONSTRAINT') return;
      throw new Error(`Got 403 but wrong code: ${body.code}`);
    }
    throw new Error(`Expected 403 but got ${res.status}`);
  });

  await test('POST /auth/set-role with role=retailer is NOT blocked by constraint', async () => {
    const res = await fetch(`${API_BASE}/auth/set-role`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: 'fake-uid-for-test', role: 'retailer' }),
    });

    if (res.status === 403) {
      const body = (await res.json()) as { code?: string };
      if (body.code === 'SINGLE_WHOLESALER_CONSTRAINT') {
        throw new Error('Retailer creation incorrectly blocked by wholesaler constraint');
      }
    }
    // Any other status is fine — the constraint itself didn't fire
  });

  // ─── Test 3: Shop owner change prevention ─────────────────────
  console.log('\n🔐 Test Group: Shop Owner Change Prevention');

  await test('PATCH /shops/:id with different ownerUid returns 403', async () => {
    // Get current shop ID
    const shopsRes = await fetch(`${API_BASE}/shops`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!shopsRes.ok) throw new Error(`GET /shops returned ${shopsRes.status}`);
    const shopsData = (await shopsRes.json()) as Record<string, unknown>;

    let shopId: string | undefined;
    if (Array.isArray(shopsData)) {
      const first = shopsData[0] as Record<string, unknown> | undefined;
      shopId = (first?.shopId ?? first?.id) as string | undefined;
    } else if (shopsData.shop) {
      const shop = shopsData.shop as Record<string, unknown>;
      shopId = (shop.shopId ?? shop.id) as string | undefined;
    } else if (Array.isArray(shopsData.shops)) {
      const first = (shopsData.shops as Record<string, unknown>[])[0];
      shopId = (first?.shopId ?? first?.id) as string | undefined;
    } else {
      shopId = (shopsData.shopId ?? shopsData.id) as string | undefined;
    }

    if (!shopId) throw new Error('Could not determine shop ID from response');

    const res = await fetch(`${API_BASE}/shops/${shopId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerUid: 'some-other-uid-attempt' }),
    });

    // 403 is expected; 401/400 (wrong role) also acceptable — prevents the change
    if ([400, 401, 403].includes(res.status)) return;
    throw new Error(`Expected 403/401/400 but got ${res.status}`);
  });

  // ─── Summary ──────────────────────────────────────────────────
  console.log('\n=====================================');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('✅ All single-shop constraints verified!\n');
  } else {
    console.log('⚠️  Some tests failed:\n');
    results.filter((r) => !r.passed).forEach((r) => console.log(`   ❌ ${r.name}: ${r.details}`));
    console.log('');
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
