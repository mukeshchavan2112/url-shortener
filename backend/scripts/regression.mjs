const BASE = 'http://localhost:5000';
const post = (body) =>
    fetch(`${BASE}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json() }));

const get = (path) => fetch(`${BASE}${path}`, { redirect: 'manual' });

const results = [];
const check = (name, actual, expected) => {
    const pass = actual === expected;
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | expected ${expected}, got ${actual}`);
};

const alias = `reg-${Date.now()}`;

const a = await post({ longUrl: 'https://example.com/a' });
check('create without alias', a.status, 201);

const b = await post({ longUrl: 'https://example.com/b', alias });
check('create with alias', b.status, 201);

const c = await post({ longUrl: 'https://example.com/c', alias });
check('duplicate alias', c.status, 409);

const d = await post({ longUrl: 'https://example.com/d', alias: 'admin' });
check('reserved alias', d.status, 400);

const e = await post({ longUrl: 'https://example.com/e', alias: '' });
check('empty alias gives generated code', e.status, 201);

const f = await post({ longUrl: 'https://example.com/f', expiresAt: true });
check('expiresAt: true rejected', f.status, 400);

const r1 = await get(`/${a.body.code}`);
check('redirect status', r1.status, 302);
check('redirect location', r1.headers.get('location'), 'https://example.com/a');

const r2 = await get('/zzzNoSuchCode9');
check('unknown code', r2.status, 404);

const exp = await post({
    longUrl: 'https://example.com/expiring',
    expiresAt: new Date(Date.now() + 60000).toISOString(),
});
check('create expiring link', exp.status, 201);
const before = await get(`/${exp.body.code}`);
check('expiring link before expiry', before.status, 302);

console.log('Waiting 65 seconds for expiry...');
await new Promise((res) => setTimeout(res, 65000));
const after = await get(`/${exp.body.code}`);
check('expiring link after expiry', after.status, 410);

console.log(results.every(Boolean) ? '\nALL PASSED' : '\nSOME FAILED');