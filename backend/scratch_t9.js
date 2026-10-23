import { execSync } from 'child_process';

for (let i = 1; i <= 21; i++) {
  const raw = execSync(
    'curl.exe -s -i -X POST http://localhost:5000/api/shorten -H "Content-Type: application/json" -d @scratch_t1.json',
    { encoding: 'utf8' }
  );

  const statusLine = (raw.match(/HTTP\/1\.1 (\d+ [A-Za-z ]+)/) || [])[1] || '';
  const remaining = (raw.match(/RateLimit-Remaining: (\d+)/) || [])[1] || '0';
  const body = (raw.match(/\{.*\}/) || [])[0] || '';

  console.log(`Request ${String(i).padStart(2)} -> Status: ${statusLine.padEnd(20)} | Remaining: ${remaining.padEnd(2)} | Body: ${body}`);
}
