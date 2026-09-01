import { generateAlfaAttendance } from '../lib/attendance/alfa';

async function main() {
  const args = process.argv.slice(2);
  let targetDate: string | undefined;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      targetDate = arg.split('=')[1];
    } else if (arg === '--force') {
      force = true;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      targetDate = arg;
    }
  }

  console.log(`[CLI RUNNER] Starting ALFA attendance generation...`);
  if (targetDate) {
    console.log(`[CLI RUNNER] Target Date: ${targetDate}`);
  }
  if (force) {
    console.log(`[CLI RUNNER] Force working day: true`);
  }

  const result = await generateAlfaAttendance({
    targetDate,
    forceWorkingDay: force,
  });

  console.log(`[CLI RUNNER] Result:`, JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[CLI RUNNER FATAL ERROR]', err);
  process.exit(1);
});
