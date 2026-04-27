async function redis(url, token, ...command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    await Promise.all([
      redis(REDIS_URL, REDIS_TOKEN, 'DEL', 'optate:visitors'),
      redis(REDIS_URL, REDIS_TOKEN, 'DEL', 'optate:countries'),
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[reset-visitors]', err);
    return res.status(500).json({ error: err.message });
  }
};
