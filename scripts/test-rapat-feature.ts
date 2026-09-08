import { prisma } from '../lib/prisma';
import { catatRapatAction, absenPagiAction, absenPulangAction, submitIzinSakitAction } from '../app/actions/attendance';
import { getAttendanceHistory } from '../lib/attendance/history';
import { generateAlfaAttendance } from '../lib/attendance/alfa';
import { getNowWib, getWibDateParts, parseWibDateString } from '../lib/time';

const SYNTHETIC_PREFIX = 'test_rapat_user_';

function assertSyntheticUsername(username: string): void {
  if (!username.startsWith(SYNTHETIC_PREFIX)) {
    throw new Error(
      `[CRITICAL SAFETY GUARD] Refusing database operation on non-synthetic username: "${username}". Expected prefix "${SYNTHETIC_PREFIX}".`
    );
  }
}

function assertSyntheticUser(user: { id: number; username: string }): void {
  if (!user.username.startsWith(SYNTHETIC_PREFIX)) {
    throw new Error(
      `[CRITICAL SAFETY GUARD] Refusing database operation on non-synthetic user ID ${user.id} ("${user.username}").`
    );
  }
}

async function runRapatFeatureTests() {
  console.log('========================================================');
  console.log('  STARTING RAPAT ATTENDANCE FEATURE TEST SUITE (SAFE)');
  console.log('  Testing both entry points: NO ATTENDANCE and HADIR');
  console.log('========================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedCount++;
    }
  }

  const syntheticUsernames = [
    'test_rapat_user_primary',
    'test_rapat_user_hadir',
    'test_rapat_user_izin',
    'test_rapat_user_sakit',
    'test_rapat_user_alfa',
    'test_rapat_user_absent',
  ];

  for (const name of syntheticUsernames) {
    assertSyntheticUsername(name);
  }

  const now = getNowWib();
  const todayParts = getWibDateParts(now);

  try {
    // Initial cleanup: remove any leftover synthetic users and attendances
    const existingTestUsers = await prisma.users.findMany({
      where: { username: { in: syntheticUsernames } },
      select: { id: true, username: true },
    });
    if (existingTestUsers.length > 0) {
      for (const u of existingTestUsers) {
        assertSyntheticUser(u);
      }
      const ids = existingTestUsers.map((u) => u.id);
      await prisma.attendances.deleteMany({ where: { person_id: { in: ids } } });
      await prisma.users.deleteMany({ where: { id: { in: ids } } });
    }

    // Create primary test user (for direct RAPAT tests)
    assertSyntheticUsername('test_rapat_user_primary');
    const primaryUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_primary',
        password_hash: 'test_hash',
        nama: 'Test Rapat Primary Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
        universitas: 'Universitas Indonesia',
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated RAPAT rejected
    // -------------------------------------------------------------------------
    delete process.env.TEST_AUTH_USER_ID;
    const unauthResult = await catatRapatAction('Rapat unauth');
    assert(
      !unauthResult.success && unauthResult.message.includes('Sesi login'),
      'TEST 1: Unauthenticated RAPAT rejected'
    );

    // -------------------------------------------------------------------------
    // TEST 1B: Empty / whitespace / oversize keterangan rejected
    // -------------------------------------------------------------------------
    process.env.TEST_AUTH_USER_ID = primaryUser.id.toString();
    const emptyResult = await catatRapatAction();
    assert(
      !emptyResult.success && emptyResult.message === 'Keterangan rapat wajib diisi.',
      'TEST 1B: Empty keterangan rejected'
    );

    const whitespaceResult = await catatRapatAction('   ');
    assert(
      !whitespaceResult.success && whitespaceResult.message === 'Keterangan rapat wajib diisi.',
      'TEST 1C: Whitespace-only keterangan rejected'
    );

    const oversizedResult = await catatRapatAction('a'.repeat(501));
    assert(
      !oversizedResult.success && oversizedResult.message === 'Keterangan rapat maksimal 500 karakter.',
      'TEST 1D: Oversized keterangan rejected'
    );

    // -------------------------------------------------------------------------
    // TEST 2: No attendance -> RAPAT succeeds with valid keterangan
    // -------------------------------------------------------------------------
    const testKeteranganPrimary = 'Rapat koordinasi teknis penyusunan kurikulum magang';
    const directRapatResult = await catatRapatAction(testKeteranganPrimary);
    assert(
      directRapatResult.success && directRapatResult.message.includes('berhasil dicatat'),
      'TEST 2: No attendance -> RAPAT succeeds with valid keterangan',
      directRapatResult.message
    );

    // Query primary record
    const directRecord = await prisma.attendances.findFirst({
      where: {
        person_id: primaryUser.id,
        date: todayParts.dateObj,
      },
    });
    const directCount = await prisma.attendances.count({
      where: {
        person_id: primaryUser.id,
        date: todayParts.dateObj,
      },
    });

    // -------------------------------------------------------------------------
    // TEST 3: No attendance -> RAPAT creates exactly one record
    // -------------------------------------------------------------------------
    assert(
      directCount === 1 && Boolean(directRecord),
      'TEST 3: No attendance -> RAPAT creates exactly one record'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Direct RAPAT record has check_in = NULL, check_out = NULL, notes = keterangan
    // -------------------------------------------------------------------------
    assert(
      directRecord?.status === 'RAPAT' &&
        directRecord?.check_in === null &&
        directRecord?.check_out === null &&
        directRecord?.notes === testKeteranganPrimary,
      'TEST 4: Direct RAPAT record has check_in = NULL, check_out = NULL, notes = keterangan'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Direct RAPAT record has GPS = NULL
    // -------------------------------------------------------------------------
    assert(
      directRecord?.latitude === null &&
        directRecord?.longitude === null &&
        directRecord?.accuracy === null &&
        directRecord?.address === null,
      'TEST 5: Direct RAPAT record has GPS = NULL'
    );

    // -------------------------------------------------------------------------
    // HADIR -> RAPAT Setup
    // Create hadirUser, insert initial HADIR attendance with check-in and GPS
    // -------------------------------------------------------------------------
    assertSyntheticUsername('test_rapat_user_hadir');
    const hadirUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_hadir',
        password_hash: 'test_hash',
        nama: 'Test Hadir to Rapat Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'Tenaga Ahli',
      },
    });

    const originalCheckIn = new Date(now.getTime() - 4 * 3600 * 1000); // 4 hours prior
    const originalLat = -6.1791728;
    const originalLng = 106.8350564;
    const originalAcc = 14.5;
    const originalAddress = 'Gedung Mina Bahari 3, Jakarta Pusat';

    const initialHadirRecord = await prisma.attendances.create({
      data: {
        person_type: 'TENAGA_AHLI',
        person_id: hadirUser.id,
        date: todayParts.dateObj,
        status: 'HADIR',
        check_in: originalCheckIn,
        check_out: null,
        latitude: originalLat,
        longitude: originalLng,
        accuracy: originalAcc,
        address: originalAddress,
        notes: null,
        updated_at: originalCheckIn,
      },
    });

    // Authenticate as hadirUser
    process.env.TEST_AUTH_USER_ID = hadirUser.id.toString();

    // Verify empty keterangan rejected for HADIR -> RAPAT as well
    const emptyHadirRapat = await catatRapatAction('   ');
    assert(
      !emptyHadirRapat.success && emptyHadirRapat.message === 'Keterangan rapat wajib diisi.',
      'TEST 5B: HADIR -> RAPAT without keterangan rejected'
    );

    const testKeteranganHadir = 'Rapat evaluasi progres bulanan di kantor dinas';
    const hadirToRapatResult = await catatRapatAction(testKeteranganHadir);

    // -------------------------------------------------------------------------
    // TEST 6: HADIR -> RAPAT succeeds with valid keterangan
    // -------------------------------------------------------------------------
    assert(
      hadirToRapatResult.success && hadirToRapatResult.message.includes('berhasil dicatat'),
      'TEST 6: HADIR -> RAPAT succeeds with valid keterangan',
      hadirToRapatResult.message
    );

    // Query updated record for hadirUser
    const convertedRecord = await prisma.attendances.findFirst({
      where: {
        person_id: hadirUser.id,
        date: todayParts.dateObj,
      },
    });
    const hadirUserRecordCount = await prisma.attendances.count({
      where: {
        person_id: hadirUser.id,
        date: todayParts.dateObj,
      },
    });

    // -------------------------------------------------------------------------
    // TEST 7: HADIR -> RAPAT updates the SAME attendance ID
    // -------------------------------------------------------------------------
    assert(
      convertedRecord !== null && convertedRecord.id === initialHadirRecord.id,
      'TEST 7: HADIR -> RAPAT updates the SAME attendance ID'
    );

    // -------------------------------------------------------------------------
    // TEST 8: HADIR -> RAPAT preserves check_in exactly and updates notes
    // -------------------------------------------------------------------------
    assert(
      convertedRecord?.status === 'RAPAT' &&
        convertedRecord?.check_in !== null &&
        convertedRecord?.check_in.getTime() === originalCheckIn.getTime() &&
        convertedRecord?.notes === testKeteranganHadir,
      'TEST 8: HADIR -> RAPAT preserves check_in exactly and updates notes'
    );

    // -------------------------------------------------------------------------
    // TEST 9: HADIR -> RAPAT preserves latitude
    // -------------------------------------------------------------------------
    assert(
      convertedRecord?.latitude === originalLat,
      'TEST 9: HADIR -> RAPAT preserves latitude'
    );

    // -------------------------------------------------------------------------
    // TEST 10: HADIR -> RAPAT preserves longitude
    // -------------------------------------------------------------------------
    assert(
      convertedRecord?.longitude === originalLng,
      'TEST 10: HADIR -> RAPAT preserves longitude'
    );

    // -------------------------------------------------------------------------
    // TEST 11: HADIR -> RAPAT preserves accuracy/address
    // -------------------------------------------------------------------------
    assert(
      convertedRecord?.accuracy === originalAcc && convertedRecord?.address === originalAddress,
      'TEST 11: HADIR -> RAPAT preserves accuracy/address'
    );

    // -------------------------------------------------------------------------
    // TEST 12: HADIR -> RAPAT leaves check_out NULL
    // -------------------------------------------------------------------------
    assert(
      convertedRecord?.check_out === null,
      'TEST 12: HADIR -> RAPAT leaves check_out NULL'
    );

    // -------------------------------------------------------------------------
    // TEST 13: HADIR -> RAPAT creates no second attendance record
    // -------------------------------------------------------------------------
    assert(
      hadirUserRecordCount === 1,
      'TEST 13: HADIR -> RAPAT creates no second attendance record'
    );

    // -------------------------------------------------------------------------
    // TEST 14: RAPAT -> RAPAT rejected
    // -------------------------------------------------------------------------
    // Authenticated as hadirUser (whose status is now RAPAT)
    const repeatRapatResult = await catatRapatAction('Rapat coba lagi');
    assert(
      !repeatRapatResult.success &&
        (repeatRapatResult.message.includes('sudah tercatat') ||
          repeatRapatResult.message.includes('Rapat')),
      'TEST 14: RAPAT -> RAPAT rejected',
      repeatRapatResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 15: IZIN -> RAPAT rejected
    // -------------------------------------------------------------------------
    assertSyntheticUsername('test_rapat_user_izin');
    const izinUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_izin',
        password_hash: 'test_hash',
        nama: 'Test Izin Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });
    await prisma.attendances.create({
      data: {
        person_type: 'MAGANG',
        person_id: izinUser.id,
        date: todayParts.dateObj,
        status: 'IZIN',
        notes: 'Izin urusan keluarga',
        updated_at: now,
      },
    });
    process.env.TEST_AUTH_USER_ID = izinUser.id.toString();
    const rapatOnIzinResult = await catatRapatAction('Rapat izin');
    assert(
      !rapatOnIzinResult.success &&
        (rapatOnIzinResult.message.includes('Izin') ||
          rapatOnIzinResult.message.includes('sudah tercatat')),
      'TEST 15: IZIN -> RAPAT rejected',
      rapatOnIzinResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 16: SAKIT -> RAPAT rejected
    // -------------------------------------------------------------------------
    assertSyntheticUsername('test_rapat_user_sakit');
    const sakitUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_sakit',
        password_hash: 'test_hash',
        nama: 'Test Sakit Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });
    await prisma.attendances.create({
      data: {
        person_type: 'MAGANG',
        person_id: sakitUser.id,
        date: todayParts.dateObj,
        status: 'SAKIT',
        notes: 'Sakit demam',
        updated_at: now,
      },
    });
    process.env.TEST_AUTH_USER_ID = sakitUser.id.toString();
    const rapatOnSakitResult = await catatRapatAction('Rapat sakit');
    assert(
      !rapatOnSakitResult.success &&
        (rapatOnSakitResult.message.includes('Sakit') ||
          rapatOnSakitResult.message.includes('sudah tercatat')),
      'TEST 16: SAKIT -> RAPAT rejected',
      rapatOnSakitResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 17: ALFA -> RAPAT rejected
    // -------------------------------------------------------------------------
    assertSyntheticUsername('test_rapat_user_alfa');
    const alfaUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_alfa',
        password_hash: 'test_hash',
        nama: 'Test Alfa Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });
    await prisma.attendances.create({
      data: {
        person_type: 'MAGANG',
        person_id: alfaUser.id,
        date: todayParts.dateObj,
        status: 'ALFA',
        updated_at: now,
      },
    });
    process.env.TEST_AUTH_USER_ID = alfaUser.id.toString();
    const rapatOnAlfaResult = await catatRapatAction('Rapat alfa');
    assert(
      !rapatOnAlfaResult.success &&
        (rapatOnAlfaResult.message.includes('Alfa') ||
          rapatOnAlfaResult.message.includes('sudah tercatat')),
      'TEST 17: ALFA -> RAPAT rejected',
      rapatOnAlfaResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 18: RAPAT blocks Absen Pagi
    // -------------------------------------------------------------------------
    process.env.TEST_AUTH_USER_ID = primaryUser.id.toString();
    const absenPagiResult = await absenPagiAction({
      latitude: -6.1791728,
      longitude: 106.8350564,
      accuracy: 10,
    });
    assert(
      !absenPagiResult.success && absenPagiResult.message.includes('Rapat'),
      'TEST 18: RAPAT blocks Absen Pagi',
      absenPagiResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 19: RAPAT blocks Absen Pulang
    // -------------------------------------------------------------------------
    // Test on primaryUser (direct RAPAT)
    process.env.TEST_AUTH_USER_ID = primaryUser.id.toString();
    const pulangDirectResult = await absenPulangAction();

    // Test on hadirUser (converted RAPAT with check_in populated)
    process.env.TEST_AUTH_USER_ID = hadirUser.id.toString();
    const pulangConvertedResult = await absenPulangAction();

    assert(
      !pulangDirectResult.success && !pulangConvertedResult.success,
      'TEST 19: RAPAT blocks Absen Pulang (both direct and converted from HADIR)',
      `Direct: ${pulangDirectResult.message}, Converted: ${pulangConvertedResult.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 20: RAPAT blocks Izin/Sakit
    // -------------------------------------------------------------------------
    process.env.TEST_AUTH_USER_ID = primaryUser.id.toString();
    const dummyFormData = new FormData();
    dummyFormData.append('status', 'IZIN');
    dummyFormData.append('notes', 'Izin urusan dinas');
    const dummyFile = new File(['dummy content'], 'surat.pdf', { type: 'application/pdf' });
    dummyFormData.append('proof', dummyFile);

    const izinResult = await submitIzinSakitAction(dummyFormData);
    assert(
      !izinResult.success && izinResult.message.includes('Rapat'),
      'TEST 20: RAPAT blocks Izin/Sakit',
      izinResult.message
    );

    // -------------------------------------------------------------------------
    // TEST 21: History correctly returns direct RAPAT with null check_in and keterangan
    // -------------------------------------------------------------------------
    const primaryHistory = await getAttendanceHistory(primaryUser.id, todayParts.dateString.slice(0, 7));
    const primaryHistoryItem = primaryHistory.items.find((item) => item.id === directRecord?.id);
    assert(
      primaryHistoryItem?.status === 'RAPAT' &&
        primaryHistoryItem?.checkInFormatted === null &&
        primaryHistoryItem?.checkOutFormatted === null &&
        primaryHistoryItem?.notes === testKeteranganPrimary,
      'TEST 21: History correctly returns direct RAPAT with null check_in and keterangan'
    );

    // -------------------------------------------------------------------------
    // TEST 22: History correctly returns converted RAPAT with original check_in and keterangan
    // -------------------------------------------------------------------------
    const hadirHistory = await getAttendanceHistory(hadirUser.id, todayParts.dateString.slice(0, 7));
    const hadirHistoryItem = hadirHistory.items.find((item) => item.id === initialHadirRecord.id);
    assert(
      hadirHistoryItem?.status === 'RAPAT' &&
        hadirHistoryItem?.checkInFormatted !== null &&
        hadirHistoryItem?.checkOutFormatted === null &&
        hadirHistoryItem?.notes === testKeteranganHadir,
      'TEST 22: History correctly returns converted RAPAT with original check_in and keterangan'
    );

    // -------------------------------------------------------------------------
    // TEST 23: ALFA generator skips RAPAT (Isolated future date with Prisma guards)
    // -------------------------------------------------------------------------
    const isolatedTestDateStr = '2099-09-02'; // Wednesday (weekday in 2099, guaranteed zero real data)
    const isolatedTestDateObj = parseWibDateString(isolatedTestDateStr)!.dateObj;

    // Create RAPAT attendance for primaryUser on isolatedTestDate
    await prisma.attendances.create({
      data: {
        person_type: 'MAGANG',
        person_id: primaryUser.id,
        date: isolatedTestDateObj,
        status: 'RAPAT',
        notes: 'Rapat Uji Isolasi',
        updated_at: now,
      },
    });

    // Create a second synthetic user with NO attendance on isolatedTestDate
    assertSyntheticUsername('test_rapat_user_absent');
    const absentUser = await prisma.users.create({
      data: {
        username: 'test_rapat_user_absent',
        password_hash: 'test_hash',
        nama: 'Test Absent Participant',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });

    // STRONG ISOLATION GUARD:
    // Intercept prisma.users.findMany during generateAlfaAttendance so it is STRICTLY
    // impossible for any production/real user to be queried, processed, or mutated.
    const realUsersFindMany = prisma.users.findMany.bind(prisma);
    const realAttendancesCreateMany = prisma.attendances.createMany.bind(prisma);

    const syntheticViewerList = [
      { id: primaryUser.id, username: primaryUser.username, nama: primaryUser.nama, jenis_personel: primaryUser.jenis_personel },
      { id: absentUser.id, username: absentUser.username, nama: absentUser.nama, jenis_personel: absentUser.jenis_personel },
    ];

    let alfaGenResult;
    try {
      // Intercept user lookup: Return ONLY synthetic test users
      prisma.users.findMany = (async (args?: any) => {
        if (args?.where?.role === 'VIEWER') {
          return syntheticViewerList.map((u) => ({
            id: u.id,
            nama: u.nama,
            jenis_personel: u.jenis_personel,
          }));
        }
        return realUsersFindMany(args);
      }) as any;

      // Intercept bulk creation: Assert all created IDs are strictly synthetic
      prisma.attendances.createMany = (async (args: any) => {
        if (Array.isArray(args?.data)) {
          for (const item of args.data) {
            if (![primaryUser.id, absentUser.id].includes(item.person_id)) {
              throw new Error(
                `[CRITICAL SAFETY BREACH] ALFA generator attempted to write attendance for non-synthetic person_id: ${item.person_id}`
              );
            }
          }
        }
        return realAttendancesCreateMany(args);
      }) as any;

      // Execute production generateAlfaAttendance function on isolated date
      alfaGenResult = await generateAlfaAttendance({
        targetDate: isolatedTestDateStr,
        forceWorkingDay: true,
      });
    } finally {
      // ALWAYS restore original Prisma functions
      prisma.users.findMany = realUsersFindMany;
      prisma.attendances.createMany = realAttendancesCreateMany;
    }

    assert(
      alfaGenResult.success &&
        !alfaGenResult.details.createdUserIds.includes(primaryUser.id) &&
        alfaGenResult.details.skippedUserIds.includes(primaryUser.id) &&
        alfaGenResult.details.createdUserIds.includes(absentUser.id),
      'TEST 23: ALFA generator skips RAPAT'
    );

  } finally {
    // -------------------------------------------------------------------------
    // TEST 24: Scoped cleanup & verification that no synthetic records remain
    // -------------------------------------------------------------------------
    delete process.env.TEST_AUTH_USER_ID;
    console.log('\n--- Guaranteed Cleanup: Removing all synthetic test records ---');
    const testUsers = await prisma.users.findMany({
      where: { username: { in: syntheticUsernames } },
      select: { id: true, username: true },
    });
    if (testUsers.length > 0) {
      for (const u of testUsers) {
        assertSyntheticUser(u);
      }
      const ids = testUsers.map((u) => u.id);
      const deletedAtt = await prisma.attendances.deleteMany({ where: { person_id: { in: ids } } });
      const deletedUsers = await prisma.users.deleteMany({ where: { id: { in: ids } } });
      console.log(`Cleaned up ${deletedAtt.count} test attendances and ${deletedUsers.count} test users.`);
    }

    const remainingTestUsers = await prisma.users.count({
      where: { username: { in: syntheticUsernames } },
    });
    const remainingTestAttendances = await prisma.attendances.count({
      where: { person_id: { in: testUsers.map((u) => u.id) } },
    });

    assert(
      remainingTestUsers === 0 && remainingTestAttendances === 0,
      'TEST 24: No synthetic test records remain'
    );
  }

  console.log('\n========================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('========================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRapatFeatureTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
