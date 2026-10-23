import { execSync } from 'child_process';

const exp = new Date(Date.now() + 4000).toISOString();
const payload = JSON.stringify({
  longUrl: 'https://example.com/expired-target',
  alias: 'exp-curl-410',
  expiresAt: exp,
});

// Step 1: Create
await fetch('http://localhost:5000/api/shorten', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: payload,
});

// Step 2: Wait until expired (4.5s)
await new Promise((r) => setTimeout(r, 4500));

// Step 3: Curl GET
const curlOutput = execSync('curl.exe -s -i http://localhost:5000/exp-curl-410', {
  encoding: 'utf8',
});
console.log(curlOutput);
