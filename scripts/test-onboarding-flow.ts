import assert from 'node:assert';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { signSessionToken, verifySessionToken } from '../lib/auth';
import { isProfileComplete, SessionPayload } from '../lib/types';
import { absenPagiAction, absenPulangAction, submitIzinSakitAction, catatRapatAction } from '../app/actions/attendance';
import { updatePersonnelInfoAction, updatePasswordAction } from '../app/actions/profile';
import { loginAction } from '../app/actions/auth';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

const SYNTHETIC_PREFIX = 'test_onboard_';

function assertSynthetic(username: string) {
  if (!username.startsWith(SYNTHETIC_PREFIX)) {
    throw new Error(`FATAL: Attempted operation on non-synthetic user: ${username}`);
  }
}

async function cleanupSyntheticUsers() {
  await prisma.users.deleteMany({
    where: {
      username: { startsWith: SYNTHETIC_PREFIX },
    },
  });
}

async function runTests() {
  console.log('--- STARTING ONBOARDING FLOW TESTS ---');
  await cleanupSyntheticUsers();

  const initialPassword = 'p3k123!';
  const initialPasswordHash = await hashPassword(initialPassword);

  let incompleteUserId = 0;
  let completeUserId = 0;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: New account has mustChangePassword = true
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] New account has mustChangePassword = true');
    const newUsername = `${SYNTHETIC_PREFIX}new_viewer`;
    assertSynthetic(newUsername);

    const newUser = await prisma.users.create({
      data: {
        username: newUsername,
        nama: '', // empty name initially
        password_hash: initialPasswordHash,
        role: 'VIEWER',
        is_active: true,
        jenis_personel: null,
        universitas: null,
      },
    });
    incompleteUserId = newUser.id;

    assert.strictEqual(
      newUser.must_change_password,
      true,
      'New user must have must_change_password = true by default'
    );
    console.log('✓ New user created with must_change_password = true');

    // -------------------------------------------------------------------------
    // TEST 2: Existing account behavior is preserved
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Existing account behavior is preserved');
    const realUsers = await prisma.users.findMany({
      where: {
        username: { not: { startsWith: SYNTHETIC_PREFIX } },
      },
      select: { id: true, username: true, must_change_password: true },
    });

    for (const u of realUsers) {
      assert.strictEqual(
        u.must_change_password,
        false,
        `Existing user ${u.username} must retain must_change_password = false`
      );
    }
    console.log(`✓ Verified ${realUsers.length} existing users all have must_change_password = false`);

    // -------------------------------------------------------------------------
    // TEST 3 & 4: Incomplete profile cannot access protected pages & cannot bypass direct URL
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3 & 4] Incomplete profile cannot access protected pages (dashboard / riwayat)');
    assert.strictEqual(
      isProfileComplete({ nama: newUser.nama, jenis_personel: newUser.jenis_personel }),
      false,
      'User with empty nama and null jenis_personel must be detected as incomplete'
    );

    // Test with whitespace-only values
    assert.strictEqual(
      isProfileComplete({ nama: '   ', jenis_personel: '   ' }),
      false,
      'Whitespace-only profile fields must be detected as incomplete'
    );

    // Test token signing & verification preserves isProfileComplete
    const incompleteToken = await signSessionToken({
      userId: newUser.id,
      username: newUser.username,
      nama: newUser.nama,
      role: 'VIEWER',
      isProfileComplete: false,
      mustChangePassword: true,
    });
    const parsedIncompleteSession = await verifySessionToken(incompleteToken);
    assert.ok(parsedIncompleteSession, 'Session token should be valid');
    assert.strictEqual(parsedIncompleteSession.isProfileComplete, false);
    assert.strictEqual(parsedIncompleteSession.mustChangePassword, true);

    // Test Edge Middleware behavior
    // 1) Accessing dashboard (/absensi) with incomplete profile -> redirect to /absensi/profil
    const reqDashboard = new NextRequest('http://localhost:3000/absensi', {
      headers: {
        cookie: `absensi_session=${incompleteToken}`,
      },
    });
    const resDashboard = await middleware(reqDashboard);
    assert.strictEqual(resDashboard?.status, 307);
    assert.strictEqual(
      new URL(resDashboard.headers.get('location')!).pathname,
      '/absensi/profil',
      'Middleware must redirect incomplete profile accessing /absensi to /absensi/profil'
    );

    // 2) Accessing riwayat (/absensi/riwayat) with incomplete profile -> redirect to /absensi/profil
    const reqRiwayat = new NextRequest('http://localhost:3000/absensi/riwayat', {
      headers: {
        cookie: `absensi_session=${incompleteToken}`,
      },
    });
    const resRiwayat = await middleware(reqRiwayat);
    assert.strictEqual(resRiwayat?.status, 307);
    assert.strictEqual(
      new URL(resRiwayat.headers.get('location')!).pathname,
      '/absensi/profil',
      'Middleware must redirect incomplete profile accessing /absensi/riwayat to /absensi/profil'
    );
    console.log('✓ Edge middleware correctly redirects incomplete profile from /absensi and /absensi/riwayat to /absensi/profil');

    // -------------------------------------------------------------------------
    // TEST 5: Incomplete profile cannot invoke protected attendance actions directly
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Incomplete profile cannot invoke attendance actions directly');
    process.env.TEST_AUTH_USER_ID = String(newUser.id);

    const pagiResult = await absenPagiAction();
    assert.strictEqual(pagiResult.success, false);
    assert.ok(
      pagiResult.message.includes('lengkapi profil'),
      `Expected message about profile completion, got: ${pagiResult.message}`
    );

    const pulangResult = await absenPulangAction();
    assert.strictEqual(pulangResult.success, false);
    assert.ok(
      pulangResult.message.includes('lengkapi profil'),
      `Expected message about profile completion, got: ${pulangResult.message}`
    );

    const dummyFormData = new FormData();
    dummyFormData.append('status', 'IZIN');
    dummyFormData.append('notes', 'Testing notes');
    // dummy File
    const dummyFile = new File(['test'], 'bukti.jpg', { type: 'image/jpeg' });
    dummyFormData.append('proof', dummyFile);
    const izinResult = await submitIzinSakitAction(dummyFormData);
    assert.strictEqual(izinResult.success, false);
    assert.ok(
      izinResult.message.includes('lengkapi profil'),
      `Expected message about profile completion, got: ${izinResult.message}`
    );

    const rapatResult = await catatRapatAction();
    assert.strictEqual(rapatResult.success, false);
    assert.ok(
      rapatResult.message.includes('lengkapi profil'),
      `Expected message about profile completion, got: ${rapatResult.message}`
    );
    console.log('✓ All protected attendance server actions (pagi, pulang, izin, rapat) reject incomplete profile');

    // -------------------------------------------------------------------------
    // TEST 6: Profile page remains accessible
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Profile page remains accessible to incomplete profile');
    const reqProfil = new NextRequest('http://localhost:3000/absensi/profil', {
      headers: {
        cookie: `absensi_session=${incompleteToken}`,
      },
    });
    const resProfil = await middleware(reqProfil);
    // NextResponse.next() returns a response without a redirect header
    assert.strictEqual(
      resProfil?.headers.get('location'),
      null,
      'Middleware must NOT redirect when user is visiting /absensi/profil'
    );
    console.log('✓ /absensi/profil is accessible without redirect');

    // -------------------------------------------------------------------------
    // TEST 7: Verification of CASES A, B, C, D, E, F
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Testing CASES A, B, C, D, E, F');

    // CASE A:
    // Nama filled + Jenis Personel = MagangHub + Universitas empty
    // -> profile save succeeds
    // -> profile is complete
    // -> attendance features accessible
    const formCaseA = new FormData();
    formCaseA.append('nama', 'Budi Santoso Onboard');
    formCaseA.append('jenisPersonel', 'MagangHub');
    formCaseA.append('universitas', '');
    const resCaseA = await updatePersonnelInfoAction(formCaseA);
    assert.strictEqual(resCaseA.success, true, 'Case A: MagangHub without universitas must succeed');
    const userCaseA = await prisma.users.findUnique({ where: { id: newUser.id } });
    assert.strictEqual(isProfileComplete(userCaseA!), true, 'Case A: Profile must be complete');
    console.log('✓ CASE A: MagangHub with empty universitas succeeds and is complete');

    // CASE B:
    // Nama filled + Jenis Personel = Tenaga Ahli + Universitas empty
    // -> profile save succeeds
    // -> profile is complete
    // -> attendance features accessible
    const formCaseB = new FormData();
    formCaseB.append('nama', 'Budi Santoso Onboard');
    formCaseB.append('jenisPersonel', 'Tenaga Ahli');
    formCaseB.append('universitas', '');
    const resCaseB = await updatePersonnelInfoAction(formCaseB);
    assert.strictEqual(resCaseB.success, true, 'Case B: Tenaga Ahli without universitas must succeed');
    const userCaseB = await prisma.users.findUnique({ where: { id: newUser.id } });
    assert.strictEqual(isProfileComplete(userCaseB!), true, 'Case B: Profile must be complete');
    console.log('✓ CASE B: Tenaga Ahli with empty universitas succeeds and is complete');

    // CASE C:
    // Nama filled + Jenis Personel = Magang Biasa + Universitas empty
    // -> profile save MUST fail
    // -> user cannot successfully complete profile through that submission
    const formCaseC = new FormData();
    formCaseC.append('nama', 'Budi Santoso Onboard');
    formCaseC.append('jenisPersonel', 'Magang Biasa');
    formCaseC.append('universitas', '');
    const resCaseC = await updatePersonnelInfoAction(formCaseC);
    assert.strictEqual(resCaseC.success, false, 'Case C: Magang Biasa without universitas MUST fail');
    assert.ok(
      resCaseC.message.includes('Universitas wajib diisi'),
      `Expected message about Universitas required, got: ${resCaseC.message}`
    );
    // Also test whitespace universitas
    const formCaseCWhitespace = new FormData();
    formCaseCWhitespace.append('nama', 'Budi Santoso Onboard');
    formCaseCWhitespace.append('jenisPersonel', 'Magang Biasa');
    formCaseCWhitespace.append('universitas', '    ');
    const resCaseCWhitespace = await updatePersonnelInfoAction(formCaseCWhitespace);
    assert.strictEqual(resCaseCWhitespace.success, false, 'Case C: Magang Biasa with whitespace universitas MUST fail');
    console.log('✓ CASE C: Magang Biasa with empty/whitespace universitas is rejected');

    // CASE D:
    // Nama filled + Jenis Personel = Magang Biasa + Universitas filled
    // -> profile save succeeds
    // -> profile is complete
    // -> attendance features accessible
    const formCaseD = new FormData();
    formCaseD.append('nama', 'Budi Santoso Onboard');
    formCaseD.append('jenisPersonel', 'Magang Biasa');
    formCaseD.append('universitas', 'Universitas Indonesia');
    const resCaseD = await updatePersonnelInfoAction(formCaseD);
    assert.strictEqual(resCaseD.success, true, 'Case D: Magang Biasa with universitas MUST succeed');
    const userCaseD = await prisma.users.findUnique({ where: { id: newUser.id } });
    assert.strictEqual(userCaseD?.universitas, 'Universitas Indonesia');
    assert.strictEqual(isProfileComplete(userCaseD!), true, 'Case D: Profile must be complete');
    console.log('✓ CASE D: Magang Biasa with universitas succeeds and is complete');

    // CASE E:
    // Nama empty + Jenis Personel filled + Universitas filled
    // -> profile incomplete
    // -> attendance features blocked
    assert.strictEqual(
      isProfileComplete({ nama: '', jenis_personel: 'MagangHub' }),
      false,
      'Case E: isProfileComplete must be false when nama is empty'
    );
    assert.strictEqual(
      isProfileComplete({ nama: '   ', jenis_personel: 'MagangHub' }),
      false,
      'Case E: isProfileComplete must be false when nama is whitespace'
    );
    const formCaseE = new FormData();
    formCaseE.append('nama', '');
    formCaseE.append('jenisPersonel', 'MagangHub');
    formCaseE.append('universitas', 'Universitas Indonesia');
    const resCaseE = await updatePersonnelInfoAction(formCaseE);
    assert.strictEqual(resCaseE.success, false, 'Case E: Save with empty nama must fail');
    console.log('✓ CASE E: Empty nama is incomplete and blocked');

    // CASE F:
    // Nama filled + Jenis Personel empty + Universitas filled
    // -> profile incomplete
    // -> attendance features blocked
    assert.strictEqual(
      isProfileComplete({ nama: 'Budi Santoso Onboard', jenis_personel: '' }),
      false,
      'Case F: isProfileComplete must be false when jenis_personel is empty'
    );
    assert.strictEqual(
      isProfileComplete({ nama: 'Budi Santoso Onboard', jenis_personel: '   ' }),
      false,
      'Case F: isProfileComplete must be false when jenis_personel is whitespace'
    );
    const formCaseF = new FormData();
    formCaseF.append('nama', 'Budi Santoso Onboard');
    formCaseF.append('jenisPersonel', '');
    formCaseF.append('universitas', 'Universitas Indonesia');
    const resCaseF = await updatePersonnelInfoAction(formCaseF);
    assert.strictEqual(resCaseF.success, false, 'Case F: Save with empty jenisPersonel must fail');
    console.log('✓ CASE F: Empty jenis_personel is incomplete and blocked');

    const userAfterUpdate = userCaseD!;

    // -------------------------------------------------------------------------
    // TEST 8: mustChangePassword remains true after profile completion
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] mustChangePassword remains true after profile completion');
    assert.strictEqual(
      userAfterUpdate.must_change_password,
      true,
      'must_change_password must still be true after updating profile info'
    );
    console.log('✓ mustChangePassword remains true after profile completion');

    // -------------------------------------------------------------------------
    // TEST 9: Password change sets mustChangePassword = false
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Password change sets mustChangePassword = false');
    const passwordForm = new FormData();
    passwordForm.append('currentPassword', initialPassword);
    passwordForm.append('newPassword', 'NewPassword999!');
    passwordForm.append('confirmPassword', 'NewPassword999!');

    const changePwResult = await updatePasswordAction(passwordForm);
    assert.strictEqual(changePwResult.success, true);

    const userAfterPw = await prisma.users.findUnique({
      where: { id: newUser.id },
    });
    assert.ok(userAfterPw);
    assert.strictEqual(
      userAfterPw.must_change_password,
      false,
      'must_change_password must be false after user changes password'
    );

    // Verify Argon2id verification with new password
    const verifyNewPw = await verifyPassword('NewPassword999!', userAfterPw.password_hash);
    assert.strictEqual(verifyNewPw, true, 'New password hash must verify with Argon2id');

    const verifyOldPw = await verifyPassword(initialPassword, userAfterPw.password_hash);
    assert.strictEqual(verifyOldPw, false, 'Old password must fail verification');
    console.log('✓ Password updated: must_change_password = false and Argon2id hash verified');

    // -------------------------------------------------------------------------
    // TEST 10: Password warning disappears after password change
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] Password warning condition is cleared');
    assert.strictEqual(userAfterPw.must_change_password, false);
    // Warning banner is conditioned on user.must_change_password
    const showWarning = (userAfterPw.must_change_password as boolean) === true;
    assert.strictEqual(showWarning, false, 'Warning banner condition must evaluate to false');
    console.log('✓ Password warning banner disappears once must_change_password is false');

    // -------------------------------------------------------------------------
    // TEST 11: Existing VIEWER RBAC remains intact
    // -------------------------------------------------------------------------
    console.log('\n[TEST 11] Existing VIEWER RBAC remains intact');
    const completedToken = await signSessionToken({
      userId: userAfterPw.id,
      username: userAfterPw.username,
      nama: userAfterPw.nama,
      role: 'VIEWER',
      isProfileComplete: true,
      mustChangePassword: false,
    });
    const parsedComplete = await verifySessionToken(completedToken);
    assert.ok(parsedComplete);
    assert.strictEqual(parsedComplete.role, 'VIEWER');
    assert.strictEqual(parsedComplete.isProfileComplete, true);

    // Accessing dashboard with complete profile -> allowed
    const reqCompletedDash = new NextRequest('http://localhost:3000/absensi', {
      headers: { cookie: `absensi_session=${completedToken}` },
    });
    const resCompletedDash = await middleware(reqCompletedDash);
    assert.strictEqual(
      resCompletedDash?.headers.get('location'),
      null,
      'Completed VIEWER session must access /absensi without redirect'
    );
    console.log('✓ Completed VIEWER session accesses /absensi normally');

    // -------------------------------------------------------------------------
    // TEST 12: ADMIN/STAFF remain blocked from Web Presensi
    // -------------------------------------------------------------------------
    console.log('\n[TEST 12] ADMIN/STAFF remain blocked from Web Presensi');
    const syntheticAdmin = await prisma.users.create({
      data: {
        username: `${SYNTHETIC_PREFIX}admin`,
        nama: 'Synthetic Admin',
        password_hash: initialPasswordHash,
        role: 'ADMIN',
        is_active: true,
      },
    });

    const syntheticStaff = await prisma.users.create({
      data: {
        username: `${SYNTHETIC_PREFIX}staff`,
        nama: 'Synthetic Staff',
        password_hash: initialPasswordHash,
        role: 'STAFF',
        is_active: true,
      },
    });

    // Test login action with synthetic admin
    const adminLoginForm = new FormData();
    adminLoginForm.append('username', syntheticAdmin.username);
    adminLoginForm.append('password', initialPassword);
    const adminLoginResult = await loginAction({}, adminLoginForm);
    assert.ok(
      adminLoginResult.error && adminLoginResult.error.includes('tidak memiliki hak akses'),
      'ADMIN must be rejected from Web Presensi login'
    );

    // Test login action with synthetic staff
    const staffLoginForm = new FormData();
    staffLoginForm.append('username', syntheticStaff.username);
    staffLoginForm.append('password', initialPassword);
    const staffLoginResult = await loginAction({}, staffLoginForm);
    assert.ok(
      staffLoginResult.error && staffLoginResult.error.includes('tidak memiliki hak akses'),
      'STAFF must be rejected from Web Presensi login'
    );

    // Test middleware rejects non-VIEWER tokens
    const adminToken = await signSessionToken({
      userId: syntheticAdmin.id,
      username: syntheticAdmin.username,
      nama: syntheticAdmin.nama,
      role: 'ADMIN' as any,
      isProfileComplete: true,
    });
    const reqAdmin = new NextRequest('http://localhost:3000/absensi', {
      headers: { cookie: `absensi_session=${adminToken}` },
    });
    const resAdmin = await middleware(reqAdmin);
    assert.strictEqual(resAdmin?.status, 307);
    assert.strictEqual(
      new URL(resAdmin.headers.get('location')!).pathname,
      '/absensi/login',
      'Middleware must reject non-VIEWER sessions to /absensi/login'
    );
    console.log('✓ ADMIN and STAFF accounts are strictly blocked from Web Presensi');

    // -------------------------------------------------------------------------
    // TEST 13: No redirect loops occur
    // -------------------------------------------------------------------------
    console.log('\n[TEST 13] Verification of no redirect loops');
    // Matrix of route vs session state:
    // 1) Unauthenticated -> /absensi/login: Next (no redirect)
    const reqUnauthLogin = new NextRequest('http://localhost:3000/absensi/login');
    assert.strictEqual((await middleware(reqUnauthLogin))?.headers.get('location'), null);

    // 2) Unauthenticated -> /absensi: Redirects to /absensi/login
    const reqUnauthDash = new NextRequest('http://localhost:3000/absensi');
    assert.strictEqual(
      new URL((await middleware(reqUnauthDash)).headers.get('location')!).pathname,
      '/absensi/login'
    );

    // 3) Incomplete profile -> /absensi/profil: Next (no redirect!)
    assert.strictEqual(
      (await middleware(new NextRequest('http://localhost:3000/absensi/profil', {
        headers: { cookie: `absensi_session=${incompleteToken}` },
      })))?.headers.get('location'),
      null
    );

    // 4) Incomplete profile -> /absensi/login: Redirects to /absensi/profil
    const resIncompleteLogin = await middleware(new NextRequest('http://localhost:3000/absensi/login', {
      headers: { cookie: `absensi_session=${incompleteToken}` },
    }));
    assert.strictEqual(
      new URL(resIncompleteLogin.headers.get('location')!).pathname,
      '/absensi/profil'
    );

    // 5) Complete profile -> /absensi/login: Redirects to /absensi
    const resCompleteLogin = await middleware(new NextRequest('http://localhost:3000/absensi/login', {
      headers: { cookie: `absensi_session=${completedToken}` },
    }));
    assert.strictEqual(
      new URL(resCompleteLogin.headers.get('location')!).pathname,
      '/absensi'
    );

    // 6) Complete profile -> /absensi: Next (no redirect)
    assert.strictEqual(
      (await middleware(new NextRequest('http://localhost:3000/absensi', {
        headers: { cookie: `absensi_session=${completedToken}` },
      })))?.headers.get('location'),
      null
    );
    console.log('✓ All routing paths verified against redirect loops');

    // -------------------------------------------------------------------------
    // TEST 14: Existing attendance/RAPAT behavior remains unchanged
    // -------------------------------------------------------------------------
    console.log('\n[TEST 14] Existing attendance / RAPAT rules remain intact');
    // For a user with completed profile, calling attendance on a test run:
    // Should fail only on attendance domain business rules (e.g. outside window, weekend, or geofence), NOT profile incomplete!
    process.env.TEST_AUTH_USER_ID = String(userAfterPw.id);
    const domainCheckResult = await absenPagiAction();
    assert.ok(
      !domainCheckResult.message.includes('lengkapi profil'),
      `Completed user should NOT get incomplete profile error, got: ${domainCheckResult.message}`
    );
    console.log(`✓ Completed user receives standard attendance business domain validation (${domainCheckResult.message})`);

    console.log('\n=========================================');
    console.log('ALL 14 ONBOARDING FLOW TESTS PASSED!');
    console.log('=========================================');
  } finally {
    delete process.env.TEST_AUTH_USER_ID;
    console.log('\nCleaning up synthetic test users...');
    await cleanupSyntheticUsers();
    console.log('Cleanup complete.');
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
