import { prisma } from '../lib/prisma';
import { generateAlfaAttendance } from '../lib/attendance/alfa';
import { parseWibDateString } from '../lib/time';

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING ALFA ATTENDANCE TEST SUITE (12 TESTS)');
  console.log('====================================================\n');

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

  // Define isolated test dates
  // 2029-01-05 is a Friday (working day)
  const testWorkingDateStr = '2029-01-05';
  const testWorkingDate = parseWibDateString(testWorkingDateStr)!.dateObj;

  // 2029-01-06 is a Saturday (weekend)
  const testWeekendStr = '2029-01-06';

  // Multi-user test date: 2029-01-12 is a Friday
  const testMultiDateStr = '2029-01-12';
  const testMultiDate = parseWibDateString(testMultiDateStr)!.dateObj;

  // Clean up any lingering test users/attendances from prior aborted test runs
  const testUsernames = [
    'test_viewer_absent_1',
    'test_viewer_hadir_2',
    'test_viewer_izin_3',
    'test_viewer_sakit_4',
    'test_viewer_idempotent_5',
    'test_viewer_inactive_6',
    'test_admin_7',
    'test_staff_8',
    'test_multi_a_hadir',
    'test_multi_b_izin',
    'test_multi_c_sakit',
    'test_multi_d_absent',
    'test_multi_e_absent',
  ];

  await prisma.attendances.deleteMany({
    where: {
      date: { in: [testWorkingDate, testMultiDate] },
    },
  });

  await prisma.users.deleteMany({
    where: {
      username: { in: testUsernames },
    },
  });

  try {
    // ----------------------------------------------------
    // SETUP TEST USERS
    // ----------------------------------------------------
    console.log('--- Setting up test users in database ---');

    const [
      viewerAbsent1,
      viewerHadir2,
      viewerIzin3,
      viewerSakit4,
      viewerIdempotent5,
      viewerInactive6,
      admin7,
      staff8,
      multiA,
      multiB,
      multiC,
      multiD,
      multiE,
    ] = await Promise.all([
      // Test 1 user
      prisma.users.create({
        data: {
          username: 'test_viewer_absent_1',
          nama: 'Test Viewer Absent 1',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      // Test 2 user
      prisma.users.create({
        data: {
          username: 'test_viewer_hadir_2',
          nama: 'Test Viewer Hadir 2',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      // Test 3 user
      prisma.users.create({
        data: {
          username: 'test_viewer_izin_3',
          nama: 'Test Viewer Izin 3',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'Tenaga Ahli',
        },
      }),
      // Test 4 user
      prisma.users.create({
        data: {
          username: 'test_viewer_sakit_4',
          nama: 'Test Viewer Sakit 4',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      // Test 5 user
      prisma.users.create({
        data: {
          username: 'test_viewer_idempotent_5',
          nama: 'Test Viewer Idempotent 5',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      // Test 6 user (Inactive)
      prisma.users.create({
        data: {
          username: 'test_viewer_inactive_6',
          nama: 'Test Viewer Inactive 6',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: false,
          jenis_personel: 'MagangHub',
        },
      }),
      // Test 7 user (ADMIN)
      prisma.users.create({
        data: {
          username: 'test_admin_7',
          nama: 'Test Admin 7',
          password_hash: 'dummy_hash',
          role: 'ADMIN',
          is_active: true,
          jenis_personel: 'Admin',
        },
      }),
      // Test 8 user (STAFF)
      prisma.users.create({
        data: {
          username: 'test_staff_8',
          nama: 'Test Staff 8',
          password_hash: 'dummy_hash',
          role: 'STAFF',
          is_active: true,
          jenis_personel: 'Staff',
        },
      }),
      // Test 10 multi users
      prisma.users.create({
        data: {
          username: 'test_multi_a_hadir',
          nama: 'Test Multi A Hadir',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_multi_b_izin',
          nama: 'Test Multi B Izin',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_multi_c_sakit',
          nama: 'Test Multi C Sakit',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'Tenaga Ahli',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_multi_d_absent',
          nama: 'Test Multi D Absent',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_multi_e_absent',
          nama: 'Test Multi E Absent',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'Tenaga Ahli',
        },
      }),
    ]);

    // Setup initial attendance records on testWorkingDate
    await Promise.all([
      // Hadir for viewerHadir2
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: viewerHadir2.id,
          date: testWorkingDate,
          status: 'HADIR',
          check_in: new Date('2029-01-05T01:00:00Z'),
          check_out: new Date('2029-01-05T09:00:00Z'),
          updated_at: new Date(),
        },
      }),
      // Izin for viewerIzin3
      prisma.attendances.create({
        data: {
          person_type: 'TENAGA_AHLI',
          person_id: viewerIzin3.id,
          date: testWorkingDate,
          status: 'IZIN',
          notes: 'Urusan keluarga',
          updated_at: new Date(),
        },
      }),
      // Sakit for viewerSakit4
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: viewerSakit4.id,
          date: testWorkingDate,
          status: 'SAKIT',
          notes: 'Demam',
          updated_at: new Date(),
        },
      }),
    ]);

    // Setup initial attendance records on testMultiDate (for Test 10)
    await Promise.all([
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: multiA.id,
          date: testMultiDate,
          status: 'HADIR',
          check_in: new Date('2029-01-12T01:00:00Z'),
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: multiB.id,
          date: testMultiDate,
          status: 'IZIN',
          notes: 'Izin seminar',
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'TENAGA_AHLI',
          person_id: multiC.id,
          date: testMultiDate,
          status: 'SAKIT',
          notes: 'Sakit flu',
          updated_at: new Date(),
        },
      }),
    ]);

    console.log('Setup complete.\n');

    // ----------------------------------------------------
    // TEST 1: Active VIEWER with no attendance receives ALFA
    // ----------------------------------------------------
    console.log('--- Running Test 1 to 8 on date:', testWorkingDateStr, '---');
    await generateAlfaAttendance({
      targetDate: testWorkingDateStr,
      forceWorkingDay: true,
    });


    const attViewerAbsent1 = await prisma.attendances.findFirst({
      where: { person_id: viewerAbsent1.id, date: testWorkingDate },
    });
    assert(
      attViewerAbsent1 !== null && attViewerAbsent1.status === 'ALFA',
      'Test 1: Active VIEWER with no attendance receives ALFA',
      `Expected ALFA status, got: ${attViewerAbsent1?.status}`
    );
    assert(
      attViewerAbsent1?.check_in === null && attViewerAbsent1?.check_out === null,
      'Test 1b: ALFA record has null check_in and null check_out',
      `Check in was: ${attViewerAbsent1?.check_in}`
    );

    // ----------------------------------------------------
    // TEST 2: Active VIEWER with HADIR remains unchanged
    // ----------------------------------------------------
    const attViewerHadir2 = await prisma.attendances.findFirst({
      where: { person_id: viewerHadir2.id, date: testWorkingDate },
    });
    assert(
      attViewerHadir2 !== null && attViewerHadir2.status === 'HADIR',
      'Test 2: Active VIEWER with HADIR remains HADIR',
      `Expected HADIR status, got: ${attViewerHadir2?.status}`
    );

    // ----------------------------------------------------
    // TEST 3: Active VIEWER with IZIN remains unchanged
    // ----------------------------------------------------
    const attViewerIzin3 = await prisma.attendances.findFirst({
      where: { person_id: viewerIzin3.id, date: testWorkingDate },
    });
    assert(
      attViewerIzin3 !== null && attViewerIzin3.status === 'IZIN',
      'Test 3: Active VIEWER with IZIN remains IZIN',
      `Expected IZIN status, got: ${attViewerIzin3?.status}`
    );

    // ----------------------------------------------------
    // TEST 4: Active VIEWER with SAKIT remains unchanged
    // ----------------------------------------------------
    const attViewerSakit4 = await prisma.attendances.findFirst({
      where: { person_id: viewerSakit4.id, date: testWorkingDate },
    });
    assert(
      attViewerSakit4 !== null && attViewerSakit4.status === 'SAKIT',
      'Test 4: Active VIEWER with SAKIT remains SAKIT',
      `Expected SAKIT status, got: ${attViewerSakit4?.status}`
    );

    // ----------------------------------------------------
    // TEST 5: Idempotency (running second time creates 0 new records)
    // ----------------------------------------------------
    const resRun2 = await generateAlfaAttendance({
      targetDate: testWorkingDateStr,
      forceWorkingDay: true,
    });
    assert(
      resRun2.alfaCreatedCount === 0,
      'Test 5: Idempotency - second run creates 0 duplicate ALFA records',
      `Expected 0 created, got: ${resRun2.alfaCreatedCount}`
    );

    const allAttViewerIdempotent5 = await prisma.attendances.findMany({
      where: { person_id: viewerIdempotent5.id, date: testWorkingDate },
    });
    assert(
      allAttViewerIdempotent5.length === 1,
      'Test 5b: Exactly 1 record exists for idempotent viewer (no duplicates)',
      `Found ${allAttViewerIdempotent5.length} records`
    );

    // ----------------------------------------------------
    // TEST 6: Inactive VIEWER (is_active = false) receives NO ALFA
    // ----------------------------------------------------
    const attViewerInactive6 = await prisma.attendances.findFirst({
      where: { person_id: viewerInactive6.id, date: testWorkingDate },
    });
    assert(
      attViewerInactive6 === null,
      'Test 6: Inactive VIEWER (is_active = false) receives NO ALFA',
      `Expected null, got: ${JSON.stringify(attViewerInactive6)}`
    );

    // ----------------------------------------------------
    // TEST 7: ADMIN receives NO ALFA
    // ----------------------------------------------------
    const attAdmin7 = await prisma.attendances.findFirst({
      where: { person_id: admin7.id, date: testWorkingDate },
    });
    assert(
      attAdmin7 === null,
      'Test 7: ADMIN receives NO ALFA',
      `Expected null, got: ${JSON.stringify(attAdmin7)}`
    );

    // ----------------------------------------------------
    // TEST 8: STAFF receives NO ALFA
    // ----------------------------------------------------
    const attStaff8 = await prisma.attendances.findFirst({
      where: { person_id: staff8.id, date: testWorkingDate },
    });
    assert(
      attStaff8 === null,
      'Test 8: STAFF receives NO ALFA',
      `Expected null, got: ${JSON.stringify(attStaff8)}`
    );

    // ----------------------------------------------------
    // TEST 9: Weekend check (Saturday/Sunday skipped without force flag)
    // ----------------------------------------------------
    console.log('\n--- Running Test 9 on weekend date:', testWeekendStr, '---');
    const resWeekend = await generateAlfaAttendance({
      targetDate: testWeekendStr,
      forceWorkingDay: false, // strictly test normal weekend handling
    });
    assert(
      resWeekend.isWorkingDay === false && resWeekend.alfaCreatedCount === 0,
      'Test 9: Weekend is automatically skipped (0 ALFA created)',
      `isWorkingDay: ${resWeekend.isWorkingDay}, created: ${resWeekend.alfaCreatedCount}`
    );

    // ----------------------------------------------------
    // TEST 10: Multiple VIEWER accounts mix
    // ----------------------------------------------------
    console.log('\n--- Running Test 10 on multi date:', testMultiDateStr, '---');
    await generateAlfaAttendance({
      targetDate: testMultiDateStr,
      forceWorkingDay: true,
    });


    const [attA, attB, attC, attD, attE] = await Promise.all([
      prisma.attendances.findFirst({ where: { person_id: multiA.id, date: testMultiDate } }),
      prisma.attendances.findFirst({ where: { person_id: multiB.id, date: testMultiDate } }),
      prisma.attendances.findFirst({ where: { person_id: multiC.id, date: testMultiDate } }),
      prisma.attendances.findFirst({ where: { person_id: multiD.id, date: testMultiDate } }),
      prisma.attendances.findFirst({ where: { person_id: multiE.id, date: testMultiDate } }),
    ]);

    assert(
      attA?.status === 'HADIR' &&
        attB?.status === 'IZIN' &&
        attC?.status === 'SAKIT' &&
        attD?.status === 'ALFA' &&
        attE?.status === 'ALFA',
      'Test 10: Mixed accounts (HADIR, IZIN, SAKIT preserved; only absent D & E marked ALFA)',
      `A:${attA?.status}, B:${attB?.status}, C:${attC?.status}, D:${attD?.status}, E:${attE?.status}`
    );
    assert(
      attD?.person_type === 'MAGANG' && attE?.person_type === 'TENAGA_AHLI',
      'Test 10b: Correct polymorphic person_type assigned (Magang vs Tenaga Ahli)',
      `D person_type: ${attD?.person_type}, E person_type: ${attE?.person_type}`
    );

    // ----------------------------------------------------
    // TEST 11: Dashboard query compatibility
    // ----------------------------------------------------
    console.log('\n--- Running Test 11 & 12 (Dashboard & Export Compatibility) ---');
    // Verify counting ALFA in "Total Tidak Hadir" using Dashboard query logic
    const dashboardAlfaCount = await prisma.attendances.count({
      where: {
        date: testMultiDate,
        status: { in: ['IZIN', 'SAKIT', 'ALFA'] },
        person_id: { in: [multiA.id, multiB.id, multiC.id, multiD.id, multiE.id] },
      },
    });
    assert(
      dashboardAlfaCount === 4, // 1 Izin + 1 Sakit + 2 Alfa
      'Test 11: Dashboard "Total Tidak Hadir" query accurately includes ALFA along with IZIN and SAKIT',
      `Expected 4, got: ${dashboardAlfaCount}`
    );

    // ----------------------------------------------------
    // TEST 12: Excel Export compatibility
    // ----------------------------------------------------
    const exportData = await prisma.attendances.findMany({
      where: {
        date: testMultiDate,
        person_id: { in: [multiD.id, multiE.id] },
      },
    });
    assert(
      exportData.length === 2 && exportData.every((r) => r.status === 'ALFA'),
      'Test 12: Export query retrieves generated ALFA records with status ALFA',
      `Found ${exportData.length} records, statuses: ${exportData.map((r) => r.status).join(', ')}`
    );
  } finally {
    // ----------------------------------------------------
    // CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log('\n--- Cleaning up test artifacts from database ---');
    await prisma.attendances.deleteMany({
      where: {
        date: { in: [testWorkingDate, testMultiDate] },
      },
    });

    await prisma.users.deleteMany({
      where: {
        username: { in: testUsernames },
      },
    });
    console.log('Cleanup finished.');
  }

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL TEST ERROR]', err);
  process.exit(1);
});
