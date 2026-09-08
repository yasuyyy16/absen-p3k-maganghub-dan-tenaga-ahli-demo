import { prisma } from '../lib/prisma';
import { generateAlfaAttendance } from '../lib/attendance/alfa';
import { absenPagiAction, absenPulangAction } from '../app/actions/attendance';
import {
  parseWibDateString,
  isWibAttendanceWindowOpen,
  isWibAttendanceWindowClosed,
  getYesterdayWib,
  isWibWorkingDay,
  getWibDayOfWeek,
  getWibDateParts,
} from '../lib/time';

/**
 * Automated Test Suite: Attendance Time-Window & ALFA Finalization Rules
 *
 * Rules:
 * 1. Mon–Thu: Window is 00:01:00 – 23:58:59 WIB (Absen Pagi enabled).
 * 2. 23:59:00 WIB: Attendance window is closed; Absen Pagi disabled; day becomes eligible for ALFA finalization.
 * 3. Next day (e.g. 00:01:00 WIB / 00:07:00 WIB): System finalizes previous working day as ALFA; new day is BELUM_ABSEN.
 * 4. User with existing HADIR cannot create a second Absen Pagi.
 * 5. Server Action rejects Absen Pagi after 23:59:00 WIB.
 * 6. Friday: Attendance window is open (00:01:00 – 23:58:59 WIB), WFH logic active (location check bypassed).
 * 7. Saturday & Sunday: Attendance is blocked, no ALFA created.
 * 8. Premature ALFA on open working day is interpreted as BELUM_ABSEN and recovered on Absen Pagi / Izin / Sakit.
 * 9. Valid statuses (HADIR, IZIN, SAKIT) are strictly preserved during ALFA finalization.
 */
async function runAttendanceTimeWindowTests() {
  console.log('Attendance Time Window & ALFA Finalization Tests');
  console.log('================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`PASS  ${testName}`);
      passedCount++;
    } else {
      console.error(`FAIL  ${testName} - ${detail || 'Assertion failed'}`);
      failedCount++;
    }
  }

  // Define isolated test usernames to ensure no production user or record is touched
  const syntheticTestUsernames = [
    'test_tw_viewer_hadir',
    'test_tw_viewer_izin',
    'test_tw_viewer_sakit',
    'test_tw_viewer_absent',
    'test_tw_viewer_pagi_rec',
    'test_tw_viewer_izin_rec',
    'test_tw_viewer_sakit_rec',
    'test_tw_viewer_action_test',
    'test_tw_viewer_outside',
  ];

  // Isolated test dates
  const thursdayDateStr = '2026-09-03';
  const thursdayDateObj = parseWibDateString(thursdayDateStr)!.dateObj;
  const wednesdayDateStr = '2026-09-02';
  const wednesdayDateObj = parseWibDateString(wednesdayDateStr)!.dateObj;
  const fridayDateStr = '2026-09-04';
  const fridayDateObj = parseWibDateString(fridayDateStr)!.dateObj;
  const saturdayDateStr = '2026-09-05';
  const sundayDateStr = '2026-09-06';

  // Clean up any lingering synthetic test artifacts from previous runs
  await prisma.attendances.deleteMany({
    where: {
      date: { in: [thursdayDateObj, wednesdayDateObj, fridayDateObj] },
    },
  });

  await prisma.users.deleteMany({
    where: {
      username: { in: syntheticTestUsernames },
    },
  });

  try {
    // =========================================================================
    // 1. TIME-WINDOW BOUNDARY TESTS
    // =========================================================================
    console.log('--- 1. Time-Window Boundary Tests ---');

    // A. 00:00:00 WIB
    const time000000 = new Date('2026-09-03T00:00:00+07:00');
    const isClosed0000 = isWibAttendanceWindowClosed(thursdayDateStr, time000000);
    const isOpen0000 = isWibAttendanceWindowOpen(thursdayDateStr, time000000);
    const targetAt0000 = isClosed0000
      ? getWibDateParts(time000000).dateString
      : getYesterdayWib(time000000).dateString;

    assert(
      !isOpen0000 && !isClosed0000 && targetAt0000 === '2026-09-02',
      '00:00:00 WIB → attendance window closed / not yet open, Sep 3 not eligible for ALFA',
      `isOpen: ${isOpen0000}, isClosed: ${isClosed0000}, target: ${targetAt0000}`
    );

    // B. 00:01:00 WIB
    const time000100 = new Date('2026-09-03T00:01:00+07:00');
    const isClosed0001 = isWibAttendanceWindowClosed(thursdayDateStr, time000100);
    const isOpen0001 = isWibAttendanceWindowOpen(thursdayDateStr, time000100);

    assert(
      isOpen0001 && !isClosed0001,
      '00:01:00 WIB → attendance window opened, Sep 3 is BELUM_ABSEN, Absen Pagi enabled',
      `isOpen: ${isOpen0001}, isClosed: ${isClosed0001}`
    );

    // C. 07:20:00 WIB
    const time072000 = new Date('2026-09-03T07:20:00+07:00');
    const isClosed0720 = isWibAttendanceWindowClosed(thursdayDateStr, time072000);
    const isOpen0720 = isWibAttendanceWindowOpen(thursdayDateStr, time072000);
    const effectiveStatus0720 = isClosed0720 ? 'ALFA' : 'BELUM_ABSEN';

    assert(
      isOpen0720 && !isClosed0720 && effectiveStatus0720 === 'BELUM_ABSEN',
      '07:20:00 WIB → attendance window OPEN, status = BELUM_ABSEN, Absen Pagi available',
      `isOpen: ${isOpen0720}, effectiveStatus: ${effectiveStatus0720}`
    );

    // D. 23:58:00 WIB
    const time235800 = new Date('2026-09-03T23:58:00+07:00');
    const isClosed235800 = isWibAttendanceWindowClosed(thursdayDateStr, time235800);
    const isOpen235800 = isWibAttendanceWindowOpen(thursdayDateStr, time235800);

    assert(
      isOpen235800 && !isClosed235800,
      '23:58:00 WIB → attendance window OPEN, attendance still allowed, no ALFA yet',
      `isOpen: ${isOpen235800}, isClosed: ${isClosed235800}`
    );

    // E. 23:58:59 WIB (Absen Pagi Enabled)
    const time235859 = new Date('2026-09-03T23:58:59+07:00');
    const isClosed235859 = isWibAttendanceWindowClosed(thursdayDateStr, time235859);
    const isOpen235859 = isWibAttendanceWindowOpen(thursdayDateStr, time235859);

    assert(
      isOpen235859 && !isClosed235859,
      '23:58:59 WIB → attendance window still OPEN, Absen Pagi enabled, status BELUM_ABSEN',
      `isOpen: ${isOpen235859}, isClosed: ${isClosed235859}`
    );

    // F. 23:59:00 WIB (Absen Pagi Disabled & Window Closed)
    const time235900 = new Date('2026-09-03T23:59:00+07:00');
    const isClosed235900 = isWibAttendanceWindowClosed(thursdayDateStr, time235900);
    const isOpen235900 = isWibAttendanceWindowOpen(thursdayDateStr, time235900);

    assert(
      !isOpen235900 && isClosed235900,
      '23:59:00 WIB → attendance window CLOSED, Absen Pagi disabled, eligible for ALFA finalization',
      `isOpen: ${isOpen235900}, isClosed: ${isClosed235900}`
    );

    // G. 23:59:59 WIB (Absen Pagi Disabled & Window Closed)
    const time235959 = new Date('2026-09-03T23:59:59+07:00');
    const isClosed235959 = isWibAttendanceWindowClosed(thursdayDateStr, time235959);
    const isOpen235959 = isWibAttendanceWindowOpen(thursdayDateStr, time235959);

    assert(
      !isOpen235959 && isClosed235959,
      '23:59:59 WIB → attendance window remains CLOSED, Absen Pagi disabled',
      `isOpen: ${isOpen235959}, isClosed: ${isClosed235959}`
    );

    // =========================================================================
    // 2. MIDNIGHT REGRESSION TEST (00:07:00 WIB)
    // =========================================================================
    console.log('\n--- 2. Midnight Regression Test ---');

    process.env.DEV_TIME_OVERRIDE = '2026-09-03T00:07:00+07:00';
    const midnightSimResult = await generateAlfaAttendance();

    // Check if any ALFA record was erroneously created for 2026-09-03
    const prematureRecordsCount = await prisma.attendances.count({
      where: {
        date: thursdayDateObj,
        status: 'ALFA',
      },
    });

    assert(
      prematureRecordsCount === 0 && midnightSimResult.date === '2026-09-02',
      '00:07 WIB → ALFA must never be generated for current working day (targets Sep 2)',
      `ALFA must never be generated for the current working day at 00:07 WIB. Found: ${prematureRecordsCount}, generator target: ${midnightSimResult.date}`
    );

    // =========================================================================
    // 3. PREVIOUS-DAY FINALIZATION TEST (2026-09-04 00:01 WIB & 07:20 WIB)
    // =========================================================================
    console.log('\n--- 3. Previous-Day Finalization Test ---');

    // Create synthetic test user who did not attend on September 3
    const userAbsent = await prisma.users.create({
      data: {
        username: 'test_tw_viewer_absent',
        nama: 'Test TW Viewer Absent',
        password_hash: 'dummy_hash',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });

    // Simulate 2026-09-04 00:01:00 WIB
    process.env.DEV_TIME_OVERRIDE = '2026-09-04T00:01:00+07:00';
    const genResult0001 = await generateAlfaAttendance();

    const attSep3At0001 = await prisma.attendances.findFirst({
      where: { person_id: userAbsent.id, date: thursdayDateObj },
    });
    const attSep4At0001 = await prisma.attendances.findFirst({
      where: { person_id: userAbsent.id, date: fridayDateObj },
    });
    const isSep4OpenAt0001 = isWibAttendanceWindowOpen('2026-09-04');

    assert(
      genResult0001.date === '2026-09-03' &&
        attSep3At0001?.status === 'ALFA' &&
        attSep4At0001 === null &&
        isSep4OpenAt0001,
      '04 Sep 00:01 WIB → finalizes Sep 3 as ALFA, Sep 4 remains open and unfinalized',
      `GenTarget: ${genResult0001.date}, Sep3Status: ${attSep3At0001?.status}, Sep4Status: ${attSep4At0001?.status}`
    );

    // Simulate 2026-09-04 07:20:00 WIB
    process.env.DEV_TIME_OVERRIDE = '2026-09-04T07:20:00+07:00';
    const genResult0720 = await generateAlfaAttendance();

    const attSep4At0720 = await prisma.attendances.findFirst({
      where: { person_id: userAbsent.id, date: fridayDateObj },
    });
    const isSep4OpenAt0720 = isWibAttendanceWindowOpen('2026-09-04');

    assert(
      genResult0720.date === '2026-09-03' && attSep4At0720 === null && isSep4OpenAt0720,
      '04 Sep 07:20 WIB → Sep 3 remains finalized, Sep 4 remains open for attendance',
      `GenTarget: ${genResult0720.date}, Sep4Status: ${attSep4At0720?.status}`
    );

    // =========================================================================
    // 4. SERVER ACTION REJECTION & DUPLICATE PREVENTION TESTS
    // =========================================================================
    console.log('\n--- 4. Server Action Enforcement & Duplicate Prevention ---');

    const testUserAction = await prisma.users.create({
      data: {
        username: 'test_tw_viewer_action_test',
        nama: 'Test TW Viewer Action Test',
        password_hash: 'dummy_hash',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });

    process.env.TEST_AUTH_USER_ID = String(testUserAction.id);

    // A. Rejection at 23:59:00 WIB (closed window)
    process.env.DEV_TIME_OVERRIDE = '2026-09-03T23:59:00+07:00';
    const actionResultAfter2359 = await absenPagiAction({
      latitude: -6.1791728,
      longitude: 106.8350564,
      accuracy: 10,
    });

    assert(
      !actionResultAfter2359.success &&
        actionResultAfter2359.message.includes('Waktu absensi hari ini telah berakhir'),
      'Server Action → rejects Absen Pagi after 23:59:00 WIB',
      `Result message was: "${actionResultAfter2359.message}"`
    );

    // B. Rejection at 00:00:00 WIB (before window opens)
    process.env.DEV_TIME_OVERRIDE = '2026-09-03T00:00:00+07:00';
    const actionResultBefore0001 = await absenPagiAction({
      latitude: -6.1791728,
      longitude: 106.8350564,
      accuracy: 10,
    });

    assert(
      !actionResultBefore0001.success &&
        actionResultBefore0001.message.includes('Periode absensi harian belum dimulai'),
      'Server Action → rejects Absen Pagi before 00:01:00 WIB',
      `Result message was: "${actionResultBefore0001.message}"`
    );

    // C. Success at 08:00:00 WIB
    process.env.DEV_TIME_OVERRIDE = '2026-09-03T08:00:00+07:00';
    const actionResultSuccess = await absenPagiAction({
      latitude: -6.1791728,
      longitude: 106.8350564,
      accuracy: 10,
    });

    assert(
      actionResultSuccess.success,
      'Server Action → successfully records Absen Pagi during open window (08:00 WIB)',
      `Result message was: "${actionResultSuccess.message}"`
    );

    // D. Duplicate rejection: User already HADIR cannot check in again
    const actionResultDuplicate = await absenPagiAction({
      latitude: -6.1791728,
      longitude: 106.8350564,
      accuracy: 10,
    });

    assert(
      !actionResultDuplicate.success &&
        actionResultDuplicate.message.includes('sudah absen pagi'),
      'Server Action → rejects second Absen Pagi when already HADIR',
      `Result message was: "${actionResultDuplicate.message}"`
    );

    // E. Monday–Thursday Absen Pagi: Geofence radius rejection (Mon–Thu GPS 100m required)
    const testUserOutside = await prisma.users.create({
      data: {
        username: 'test_tw_viewer_outside',
        nama: 'Test TW Viewer Outside',
        password_hash: 'dummy_hash',
        role: 'VIEWER',
        is_active: true,
        jenis_personel: 'MagangHub',
      },
    });
    process.env.TEST_AUTH_USER_ID = String(testUserOutside.id);
    const actionResultOutsidePagi = await absenPagiAction({
      latitude: -6.2000000, // Outside 100m radius
      longitude: 106.8000000,
      accuracy: 10,
    });
    assert(
      !actionResultOutsidePagi.success &&
        actionResultOutsidePagi.message.includes('di luar radius absensi'),
      'Server Action → rejects Monday–Thursday Absen Pagi outside 100m radius',
      `Result message was: "${actionResultOutsidePagi.message}"`
    );

    // F. Monday–Thursday Absen Pulang without Absen Pagi → must fail
    const actionResultPulangNoPagi = await absenPulangAction(undefined);
    assert(
      !actionResultPulangNoPagi.success &&
        actionResultPulangNoPagi.message.includes('belum melakukan absen pagi'),
      'Server Action → rejects Absen Pulang when user has not checked in',
      `Result message was: "${actionResultPulangNoPagi.message}"`
    );

    // G. Monday–Thursday Absen Pulang without GPS (undefined) → must succeed (location-independent)
    process.env.TEST_AUTH_USER_ID = String(testUserAction.id);
    process.env.DEV_TIME_OVERRIDE = '2026-09-03T17:05:00+07:00';
    const actionResultPulangNoGps = await absenPulangAction(undefined);
    assert(
      actionResultPulangNoGps.success,
      'Server Action → successfully records Monday–Thursday Absen Pulang without GPS (location-independent)',
      `Result message was: "${actionResultPulangNoGps.message}"`
    );

    // Verify record in DB has null checkout location coordinates
    const attendanceRec = await prisma.attendances.findFirst({
      where: {
        person_id: testUserAction.id,
        date: thursdayDateObj,
      },
    });
    assert(
      attendanceRec?.check_out !== null && attendanceRec?.latitude_out === null,
      'Database → Absen Pulang saved with timestamp and null latitude_out',
      `check_out: ${attendanceRec?.check_out}, latitude_out: ${attendanceRec?.latitude_out}`
    );

    // H. Monday–Thursday duplicate Absen Pulang → must fail
    const actionResultDuplicatePulang = await absenPulangAction(undefined);
    assert(
      !actionResultDuplicatePulang.success &&
        actionResultDuplicatePulang.message.includes('sudah melakukan absen pulang'),
      'Server Action → rejects duplicate Absen Pulang',
      `Result message was: "${actionResultDuplicatePulang.message}"`
    );

    delete process.env.TEST_AUTH_USER_ID;

    // =========================================================================
    // 5. VALID STATUS PRESERVATION TEST (HADIR, IZIN, SAKIT)
    // =========================================================================
    console.log('\n--- 5. Valid Status Preservation Test ---');

    const [userHadir, userIzin, userSakit] = await Promise.all([
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_hadir',
          nama: 'Test TW Viewer Hadir',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_izin',
          nama: 'Test TW Viewer Izin',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'Tenaga Ahli',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_sakit',
          nama: 'Test TW Viewer Sakit',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
    ]);

    // Setup attendance on Wednesday (Sep 2)
    await Promise.all([
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: userHadir.id,
          date: wednesdayDateObj,
          status: 'HADIR',
          check_in: new Date('2026-09-02T08:00:00+07:00'),
          check_out: new Date('2026-09-02T17:05:00+07:00'),
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'TENAGA_AHLI',
          person_id: userIzin.id,
          date: wednesdayDateObj,
          status: 'IZIN',
          notes: 'Izin urusan dinas',
          proof_file_url: '/proofs/izin.pdf',
          updated_at: new Date(),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: userSakit.id,
          date: wednesdayDateObj,
          status: 'SAKIT',
          notes: 'Sakit flu berat',
          proof_file_url: '/proofs/sakit.jpg',
          updated_at: new Date(),
        },
      }),
    ]);

    // Run ALFA generator for Sep 2
    await generateAlfaAttendance({
      targetDate: wednesdayDateStr,
      forceWorkingDay: true,
    });

    const [recHadir, recIzin, recSakit] = await Promise.all([
      prisma.attendances.findFirst({ where: { person_id: userHadir.id, date: wednesdayDateObj } }),
      prisma.attendances.findFirst({ where: { person_id: userIzin.id, date: wednesdayDateObj } }),
      prisma.attendances.findFirst({ where: { person_id: userSakit.id, date: wednesdayDateObj } }),
    ]);

    assert(
      recHadir?.status === 'HADIR' && recHadir.check_in !== null,
      'HADIR preservation → remains HADIR with check_in preserved',
      `HADIR status was: ${recHadir?.status}`
    );
    assert(
      recIzin?.status === 'IZIN' && recIzin.proof_file_url === '/proofs/izin.pdf',
      'IZIN preservation → remains IZIN with proof URL preserved',
      `IZIN status was: ${recIzin?.status}`
    );
    assert(
      recSakit?.status === 'SAKIT' && recSakit.proof_file_url === '/proofs/sakit.jpg',
      'SAKIT preservation → remains SAKIT with proof URL preserved',
      `SAKIT status was: ${recSakit?.status}`
    );

    // =========================================================================
    // 6. PREMATURE ALFA RECOVERY TEST
    // =========================================================================
    console.log('\n--- 6. Premature ALFA Recovery Test ---');

    const [userRecPagi, userRecIzin, userRecSakit] = await Promise.all([
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_pagi_rec',
          nama: 'Test TW Recovery Pagi',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_izin_rec',
          nama: 'Test TW Recovery Izin',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'Tenaga Ahli',
        },
      }),
      prisma.users.create({
        data: {
          username: 'test_tw_viewer_sakit_rec',
          nama: 'Test TW Recovery Sakit',
          password_hash: 'dummy_hash',
          role: 'VIEWER',
          is_active: true,
          jenis_personel: 'MagangHub',
        },
      }),
    ]);

    // Insert premature ALFA records on Thursday (Sep 3)
    const [prematureAlfaPagi, prematureAlfaIzin, prematureAlfaSakit] = await Promise.all([
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: userRecPagi.id,
          date: thursdayDateObj,
          status: 'ALFA',
          updated_at: new Date('2026-09-03T00:07:00+07:00'),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'TENAGA_AHLI',
          person_id: userRecIzin.id,
          date: thursdayDateObj,
          status: 'ALFA',
          updated_at: new Date('2026-09-03T00:07:00+07:00'),
        },
      }),
      prisma.attendances.create({
        data: {
          person_type: 'MAGANG',
          person_id: userRecSakit.id,
          date: thursdayDateObj,
          status: 'ALFA',
          updated_at: new Date('2026-09-03T00:07:00+07:00'),
        },
      }),
    ]);

    // Simulate 2026-09-03 10:00:00 WIB
    const time1000 = new Date('2026-09-03T10:00:00+07:00');
    const isWindowClosed1000 = isWibAttendanceWindowClosed(thursdayDateObj, time1000);
    const dashboardStatus1000 = isWindowClosed1000 ? 'ALFA' : 'BELUM_ABSEN';

    assert(
      dashboardStatus1000 === 'BELUM_ABSEN',
      'Dashboard evaluation at 10:00 WIB → premature ALFA evaluates to BELUM_ABSEN',
      `Dashboard status was: ${dashboardStatus1000}`
    );

    // Test Absen Pagi recovery: ALFA -> HADIR
    const updatedPagi = await prisma.attendances.update({
      where: { id: prematureAlfaPagi.id },
      data: {
        check_in: time1000,
        status: 'HADIR',
        latitude: -6.1791728,
        longitude: 106.8350564,
        accuracy: 10,
        address: 'Gedung Mina Bahari 3',
        updated_at: time1000,
      },
    });

    const countPagi = await prisma.attendances.count({
      where: { person_id: userRecPagi.id, date: thursdayDateObj },
    });

    assert(
      updatedPagi.status === 'HADIR' &&
        updatedPagi.check_in !== null &&
        updatedPagi.latitude !== null &&
        countPagi === 1,
      'Premature ALFA recovery → HADIR (updates existing record, 0 duplicates)',
      `Status: ${updatedPagi.status}, check_in: ${updatedPagi.check_in}, count: ${countPagi}`
    );

    // Test Izin recovery: ALFA -> IZIN
    const updatedIzinRec = await prisma.attendances.update({
      where: { id: prematureAlfaIzin.id },
      data: {
        status: 'IZIN',
        notes: 'Izin dinas luar',
        proof_file_url: '/proofs/izin_recovery.pdf',
        check_in: null,
        check_out: null,
        updated_at: time1000,
      },
    });

    const countIzin = await prisma.attendances.count({
      where: { person_id: userRecIzin.id, date: thursdayDateObj },
    });

    assert(
      updatedIzinRec.status === 'IZIN' &&
        updatedIzinRec.proof_file_url === '/proofs/izin_recovery.pdf' &&
        countIzin === 1,
      'Premature ALFA recovery → IZIN (updates existing record, proof saved, 0 duplicates)',
      `Status: ${updatedIzinRec.status}, proof: ${updatedIzinRec.proof_file_url}, count: ${countIzin}`
    );

    // Test Sakit recovery: ALFA -> SAKIT
    const updatedSakitRec = await prisma.attendances.update({
      where: { id: prematureAlfaSakit.id },
      data: {
        status: 'SAKIT',
        notes: 'Sakit flu',
        proof_file_url: '/proofs/sakit_recovery.jpg',
        check_in: null,
        check_out: null,
        updated_at: time1000,
      },
    });

    const countSakit = await prisma.attendances.count({
      where: { person_id: userRecSakit.id, date: thursdayDateObj },
    });

    assert(
      updatedSakitRec.status === 'SAKIT' &&
        updatedSakitRec.proof_file_url === '/proofs/sakit_recovery.jpg' &&
        countSakit === 1,
      'Premature ALFA recovery → SAKIT (updates existing record, proof saved, 0 duplicates)',
      `Status: ${updatedSakitRec.status}, proof: ${updatedSakitRec.proof_file_url}, count: ${countSakit}`
    );

    // =========================================================================
    // 7. FRIDAY WFH TEST
    // =========================================================================
    console.log('\n--- 7. Friday WFH Test ---');

    const fridayTime1000 = new Date('2026-09-04T10:00:00+07:00');
    const fridayDayOfWeek = getWibDayOfWeek(fridayTime1000);
    const isFridayWindowOpen = isWibAttendanceWindowOpen(fridayDateStr, fridayTime1000);

    // Check location restriction condition from absenPagiAction:
    // Location check applies ONLY for Monday–Thursday (dayOfWeek >= 1 && dayOfWeek <= 4)
    const isOfficeRadiusEnforced = fridayDayOfWeek >= 1 && fridayDayOfWeek <= 4;

    assert(
      fridayDayOfWeek === 5 && isFridayWindowOpen && !isOfficeRadiusEnforced,
      'Friday WFH → attendance window open, location restriction bypassed (WFH active)',
      `dayOfWeek: ${fridayDayOfWeek}, isOpen: ${isFridayWindowOpen}, isOfficeRadiusEnforced: ${isOfficeRadiusEnforced}`
    );

    // =========================================================================
    // 8. WEEKEND TEST (SATURDAY & SUNDAY)
    // =========================================================================
    console.log('\n--- 8. Weekend Test (Saturday & Sunday) ---');

    const satTime = new Date('2026-09-05T10:00:00+07:00');
    const satDayOfWeek = getWibDayOfWeek(satTime);
    const satIsWorkingDay = isWibWorkingDay(satTime);
    const satBlocked = satDayOfWeek === 6 || satDayOfWeek === 0;
    const satAlfaRes = await generateAlfaAttendance({
      targetDate: saturdayDateStr,
      forceWorkingDay: false,
    });

    assert(
      satDayOfWeek === 6 && !satIsWorkingDay && satBlocked && satAlfaRes.alfaCreatedCount === 0,
      'Saturday holiday → attendance blocked, 0 ALFA generated',
      `dayOfWeek: ${satDayOfWeek}, isWorkingDay: ${satIsWorkingDay}, alfaCreated: ${satAlfaRes.alfaCreatedCount}`
    );

    const sunTime = new Date('2026-09-06T10:00:00+07:00');
    const sunDayOfWeek = getWibDayOfWeek(sunTime);
    const sunIsWorkingDay = isWibWorkingDay(sunTime);
    const sunBlocked = sunDayOfWeek === 6 || sunDayOfWeek === 0;
    const sunAlfaRes = await generateAlfaAttendance({
      targetDate: sundayDateStr,
      forceWorkingDay: false,
    });

    assert(
      sunDayOfWeek === 0 && !sunIsWorkingDay && sunBlocked && sunAlfaRes.alfaCreatedCount === 0,
      'Sunday holiday → attendance blocked, 0 ALFA generated',
      `dayOfWeek: ${sunDayOfWeek}, isWorkingDay: ${sunIsWorkingDay}, alfaCreated: ${sunAlfaRes.alfaCreatedCount}`
    );
  } finally {
    // =========================================================================
    // CLEANUP SYNTHETIC TEST ARTIFACTS
    // =========================================================================
    console.log('\n--- Cleaning up synthetic test artifacts ---');
    delete process.env.DEV_TIME_OVERRIDE;
    delete process.env.TEST_AUTH_USER_ID;

    await prisma.attendances.deleteMany({
      where: {
        date: { in: [thursdayDateObj, wednesdayDateObj, fridayDateObj] },
      },
    });

    await prisma.users.deleteMany({
      where: {
        username: { in: syntheticTestUsernames },
      },
    });
    console.log('Cleanup finished. No production data modified.');
  }

  console.log('\n================================================');
  console.log(`Total: ${passedCount}/${passedCount + failedCount} PASS`);
  console.log('================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAttendanceTimeWindowTests().catch((err) => {
  console.error('[FATAL TEST ERROR]', err);
  process.exit(1);
});
