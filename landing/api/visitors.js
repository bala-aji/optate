async function redis(url, token, ...command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).end();

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const [raw, countryRaw, referrerRaw] = await Promise.all([
      redis(REDIS_URL, REDIS_TOKEN, 'LRANGE', 'optate:visitors', 0, 199),
      redis(REDIS_URL, REDIS_TOKEN, 'ZREVRANGE', 'optate:countries', 0, 19, 'WITHSCORES'),
      redis(REDIS_URL, REDIS_TOKEN, 'ZREVRANGE', 'optate:referrers', 0, 19, 'WITHSCORES'),
    ]);

    const visitors = (raw || []).map(s => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean);

    const countries = [];
    const arr = countryRaw || [];
    for (let i = 0; i < arr.length; i += 2) {
      const parts = arr[i].split(':');
      countries.push({ code: parts[0], name: parts.slice(1).join(':'), count: parseInt(arr[i + 1], 10) });
    }

    const referrers = [];
    const rarr = referrerRaw || [];
    for (let i = 0; i < rarr.length; i += 2) {
      referrers.push({ domain: rarr[i], count: parseInt(rarr[i + 1], 10) });
    }

    return res.status(200).json({ visitors, countries, referrers });
  } catch (err) {
    console.error('[visitors]', err);
    return res.status(500).json({ error: err.message });
  }
};
