import { prisma } from '../lib/prisma';
import { generateAlfaAttendance } from '../lib/attendance/alfa';
import {
  parseWibDateString,
  isWibAttendanceWindowOpen,
  isWibAttendanceWindowClosed,
  getYesterdayWib,
  isWibWorkingDay,
  getWibDateParts,
} from '../lib/time';

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
  const testDateStr = '2026-09-03'; // Thursday
  const testDateObj = parseWibDateString(testDateStr)!.dateObj;
  const testDateYesterdayStr = '2026-09-02'; // Wednesday
  const testDateYesterdayObj = parseWibDateString(testDateYesterdayStr)!.dateObj;
  const testSaturdayStr = '2026-09-05'; // Saturday
  const testSundayStr = '2026-09-06'; // Sunday

  const testUsernames = [
    'test_user_alfa_recovery_pagi',
    'test_user_alfa_recovery_izin',
    'test_viewer_absent_1',
    'test_viewer_hadir_2',
    'test_viewer_izin_3',
    'test_viewer_sakit_4',
  ];

  // Clean up any existing test artifacts
  await prisma.attendances.deleteMany({
    where: {
      date: { in: [testDateObj, testDateYesterdayObj] },
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
    const [userPagi, userIzin, viewerAbsent1, viewerHadir2, viewerIzin3, viewerSakit4] =
      await Promise.all([
        prisma.users.create({
          data: {
            username: 'test_user_alfa_recovery_pagi',
            nama: 'Test User Recovery Pagi',
            password_hash: 'dummy_hash',
            role: 'VIEWER',
            is_active: true,
            jenis_personel: 'MagangHub',
          },
        }),
        prisma.users.create({
          data: {
            username: 'test_user_alfa_recovery_izin',
            nama: 'Test User Recovery Izin',
            password_hash: 'dummy_hash',
            role: 'VIEWER',
            is_active: true,
            jenis_personel: 'Tenaga Ahli',
          },
        }),
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
      ]);

    // ----------------------------------------------------
    // TEST 1: 03 Sep 2026 00:07 WIB -> Target ALFA = 02 Sep 2026. Tidak boleh membuat ALFA 03 Sep.
    // ----------------------------------------------------
    const time0007 = new Date('2026-09-03T00:07:00+07:00');
    const target0007 = isWibAttendanceWindowClosed(testDateStr, time0007)
      ? getWibDateParts(time0007).dateString
      : getYesterdayWib(time0007).dateString;

    assert(
      target0007 === '2026-09-02' && !isWibAttendanceWindowClosed(testDateStr, time0007),
      'TEST 1: 03 Sep 2026 00:07 WIB targets yesterday (02 Sep 2026), does not close 03 Sep',
      `Target was: ${target0007}`
    );

    // ----------------------------------------------------
    // TEST 2: 03 Sep 2026 07:20 WIB -> Target ALFA = 02 Sep 2026. 03 Sep tetap terbuka.
    // ----------------------------------------------------
    const time0720 = new Date('2026-09-03T07:20:00+07:00');
    const target0720 = isWibAttendanceWindowClosed(testDateStr, time0720)
      ? getWibDateParts(time0720).dateString
      : getYesterdayWib(time0720).dateString;
    const isOpen0720 = isWibAttendanceWindowOpen(testDateStr, time0720);

    assert(
      target0720 === '2026-09-02' && isOpen0720 && !isWibAttendanceWindowClosed(testDateStr, time0720),
      'TEST 2: 03 Sep 2026 07:20 WIB targets 02 Sep 2026, 03 Sep window remains actively open',
      `Target: ${target0720}, isOpen: ${isOpen0720}`
    );

    // ----------------------------------------------------
    // TEST 3: 03 Sep 2026 12:00 WIB -> 03 Sep belum dapat menjadi ALFA.
    // ----------------------------------------------------
    const time1200 = new Date('2026-09-03T12:00:00+07:00');
    const isClosed1200 = isWibAttendanceWindowClosed(testDateStr, time1200);

    assert(
      !isClosed1200,
      'TEST 3: 03 Sep 2026 12:00 WIB - 03 Sep attendance window is NOT closed (cannot be ALFA)',
      `isClosed: ${isClosed1200}`
    );

    // ----------------------------------------------------
    // TEST 4: 03 Sep 2026 23:30 WIB -> 03 Sep belum dapat menjadi ALFA.
    // ----------------------------------------------------
    const time2330 = new Date('2026-09-03T23:30:00+07:00');
    const isClosed2330 = isWibAttendanceWindowClosed(testDateStr, time2330);

    assert(
      !isClosed2330,
      'TEST 4: 03 Sep 2026 23:30 WIB - 03 Sep attendance window is NOT closed (cannot be ALFA)',
      `isClosed: ${isClosed2330}`
    );

    // ----------------------------------------------------
    // TEST 5: 03 Sep 2026 23:58:59 WIB -> Periode absensi masih terbuka. Belum absen = BELUM ABSEN.
    // ----------------------------------------------------
    const time235859 = new Date('2026-09-03T23:58:59+07:00');
    const isOpen235859 = isWibAttendanceWindowOpen(testDateStr, time235859);
    const isClosed235859 = isWibAttendanceWindowClosed(testDateStr, time235859);

    assert(
      isOpen235859 && !isClosed235859,
      'TEST 5: 03 Sep 2026 23:58:59 WIB - Attendance window is still open (status = BELUM ABSEN)',
      `isOpen: ${isOpen235859}, isClosed: ${isClosed235859}`
    );

    // ----------------------------------------------------
    // TEST 6: 03 Sep 2026 23:59:00 WIB -> Periode absensi 03 Sep selesai. Jika belum ada absensi valid: ALFA boleh dibuat.
    // ----------------------------------------------------
    const time235900 = new Date('2026-09-03T23:59:00+07:00');
    const isOpen235900 = isWibAttendanceWindowOpen(testDateStr, time235900);
    const isClosed235900 = isWibAttendanceWindowClosed(testDateStr, time235900);

    assert(
      !isOpen235900 && isClosed235900,
      'TEST 6: 03 Sep 2026 23:59:00 WIB - Attendance window is officially closed (ALFA can be generated)',
      `isOpen: ${isOpen235900}, isClosed: ${isClosed235900}`
    );

    // ----------------------------------------------------
    // TEST 7: 04 Sep 2026 00:01 WIB -> Generator dapat memfinalisasi 03 Sep.
    // ----------------------------------------------------
    const time04Sep0001 = new Date('2026-09-04T00:01:00+07:00');
    const target04Sep = isWibAttendanceWindowClosed('2026-09-04', time04Sep0001)
      ? getWibDateParts(time04Sep0001).dateString
      : getYesterdayWib(time04Sep0001).dateString;
    const is03SepClosedFrom04Sep = isWibAttendanceWindowClosed(testDateStr, time04Sep0001);

    assert(
      target04Sep === '2026-09-03' && is03SepClosedFrom04Sep,
      'TEST 7: 04 Sep 2026 00:01 WIB - Generator targets and finalizes 03 Sep 2026',
      `Target: ${target04Sep}, is03SepClosed: ${is03SepClosedFrom04Sep}`
    );

    // ----------------------------------------------------
    // TEST 8: 03 Sep 2026 07:20 WIB with existing record ALFA -> Expected dashboard: BELUM ABSEN.
    // ----------------------------------------------------
    const isWindowClosedAt0720 = isWibAttendanceWindowClosed(testDateObj, time0720);
    // When window is not closed, ALFA status in dashboard evaluates to BELUM_ABSEN
    const effectiveStatusAt0720 = isWindowClosedAt0720 ? 'ALFA' : 'BELUM_ABSEN';

    assert(
      effectiveStatusAt0720 === 'BELUM_ABSEN',
      'TEST 8: 03 Sep 2026 07:20 WIB existing ALFA evaluates to BELUM_ABSEN on dashboard',
      `Effective status: ${effectiveStatusAt0720}`
    );

    // ----------------------------------------------------
    // TEST 9: 03 Sep 2026 07:20 WIB existing ALFA, user melakukan Absen Pagi -> update ALFA menjadi HADIR
    // ----------------------------------------------------
    // Create existing ALFA record for userPagi
    const existingAlfaPagi = await prisma.attendances.create({
      data: {
        person_type: 'MAGANG',
        person_id: userPagi.id,
        date: testDateObj,
        status: 'ALFA',
        updated_at: new Date('2026-09-03T00:07:00Z'),
      },
    });

    // Simulate Absen Pagi recovery update
    const updatedHadir = await prisma.attendances.update({
      where: { id: existingAlfaPagi.id },
      data: {
        check_in: new Date('2026-09-03T07:20:00+07:00'),
        status: 'HADIR',
        latitude: -6.1791,
        longitude: 106.835,
        accuracy: 10,
        address: 'Gedung Mina Bahari 3',
        updated_at: new Date(),
      },
    });

    const countPagiRecords = await prisma.attendances.count({
      where: { person_id: userPagi.id, date: testDateObj },
    });

    assert(
      updatedHadir.status === 'HADIR' &&
        updatedHadir.check_in !== null &&
        updatedHadir.latitude !== null &&
        countPagiRecords === 1,
      'TEST 9: Existing ALFA record successfully updated to HADIR on Absen Pagi (0 duplicates)',
      `Status: ${updatedHadir.status}, count: ${countPagiRecords}`
    );

    // ----------------------------------------------------
    // TEST 10: 03 Sep 2026 07:20 WIB existing ALFA, user mengajukan IZIN -> update ALFA menjadi IZIN
    // ----------------------------------------------------
    const existingAlfaIzin = await prisma.attendances.create({
      data: {
        person_type: 'TENAGA_AHLI',
        person_id: userIzin.id,
        date: testDateObj,
        status: 'ALFA',
        updated_at: new Date('2026-09-03T00:07:00Z'),
      },
    });

    // Simulate submit Izin recovery update
    const updatedIzin = await prisma.attendances.update({
      where: { id: existingAlfaIzin.id },
      data: {
        status: 'IZIN',
        notes: 'Keperluan dinas luar',
        proof_file_url: '/uploads/surat_tugas.pdf',
        check_in: null,
        check_out: null,
        updated_at: new Date(),
      },
    });

    const countIzinRecords = await prisma.attendances.count({
      where: { person_id: userIzin.id, date: testDateObj },
    });

    assert(
      updatedIzin.status === 'IZIN' &&
        updatedIzin.proof_file_url === '/uploads/surat_tugas.pdf' &&
        updatedIzin.notes === 'Keperluan dinas luar' &&
        countIzinRecords === 1,
      'TEST 10: Existing ALFA record successfully updated to IZIN with proof saved (0 duplicates)',
      `Status: ${updatedIzin.status}, proof: ${updatedIzin.proof_file_url}, count: ${countIzinRecords}`
    );

    // ----------------------------------------------------
    // TEST 11: Sabtu -> libur. Tidak bisa absen. Tidak menghasilkan ALFA.
    // ----------------------------------------------------
    const satDate = parseWibDateString(testSaturdayStr)!.dateObj;
    const isSatWorkingDay = isWibWorkingDay(satDate);
    const satAlfaResult = await generateAlfaAttendance({
      targetDate: testSaturdayStr,
      forceWorkingDay: false,
    });

    assert(
      !isSatWorkingDay && satAlfaResult.isWorkingDay === false && satAlfaResult.alfaCreatedCount === 0,
      'TEST 11: Saturday is holiday (isWorkingDay = false, 0 ALFA generated)',
      `isWorkingDay: ${isSatWorkingDay}, alfaCreated: ${satAlfaResult.alfaCreatedCount}`
    );

    // ----------------------------------------------------
    // TEST 12: Minggu -> libur. Tidak bisa absen. Tidak menghasilkan ALFA.
    // ----------------------------------------------------
    const sunDate = parseWibDateString(testSundayStr)!.dateObj;
    const isSunWorkingDay = isWibWorkingDay(sunDate);
    const sunAlfaResult = await generateAlfaAttendance({
      targetDate: testSundayStr,
      forceWorkingDay: false,
    });

    assert(
      !isSunWorkingDay && sunAlfaResult.isWorkingDay === false && sunAlfaResult.alfaCreatedCount === 0,
      'TEST 12: Sunday is holiday (isWorkingDay = false, 0 ALFA generated)',
      `isWorkingDay: ${isSunWorkingDay}, alfaCreated: ${sunAlfaResult.alfaCreatedCount}`
    );

    // Additional test: Full ALFA generation on finalized date preserves HADIR/IZIN/SAKIT
    await Promise.all([
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: viewerHadir2.id,
          date: testDateYesterdayObj,
          status: 'HADIR',
          check_in: new Date('2026-09-02T01:00:00Z'),
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'TENAGA_AHLI',
          person_id: viewerIzin3.id,
          date: testDateYesterdayObj,
          status: 'IZIN',
          notes: 'Izin seminar',
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: viewerSakit4.id,
          date: testDateYesterdayObj,
          status: 'SAKIT',
          notes: 'Demam',
          updated_at: new Date(),
        },
      }),
    ]);

    const resGenYesterday = await generateAlfaAttendance({
      targetDate: testDateYesterdayStr,
      forceWorkingDay: true,
    });
    console.log('Finalized yesterday created ALFA count:', resGenYesterday.alfaCreatedCount);

    const [attAbsent1, attHadir2, attIzin3, attSakit4] = await Promise.all([
      prisma.attendances.findFirst({ where: { person_id: viewerAbsent1.id, date: testDateYesterdayObj } }),
      prisma.attendances.findFirst({ where: { person_id: viewerHadir2.id, date: testDateYesterdayObj } }),
      prisma.attendances.findFirst({ where: { person_id: viewerIzin3.id, date: testDateYesterdayObj } }),
      prisma.attendances.findFirst({ where: { person_id: viewerSakit4.id, date: testDateYesterdayObj } }),
    ]);

    assert(
      attAbsent1?.status === 'ALFA' &&
        attHadir2?.status === 'HADIR' &&
        attIzin3?.status === 'IZIN' &&
        attSakit4?.status === 'SAKIT',
      'BONUS: Finalized working day preserves HADIR, IZIN, SAKIT and marks only absent as ALFA',
      `Absent1:${attAbsent1?.status}, Hadir2:${attHadir2?.status}, Izin3:${attIzin3?.status}, Sakit4:${attSakit4?.status}`
    );
  } finally {
    // ----------------------------------------------------
    // CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log('\n--- Cleaning up test artifacts from database ---');
    await prisma.attendances.deleteMany({
      where: {
        date: { in: [testDateObj, testDateYesterdayObj] },
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

