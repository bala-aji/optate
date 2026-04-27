const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd, ...args]),
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).end();

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const [raw, countryData] = await Promise.all([
      redis('LRANGE', 'optate:visitors', 0, 199),
      redis('ZREVRANGE', 'optate:countries', 0, 19, 'WITHSCORES'),
    ]);

    const visitors = (raw || []).map(s => {
      try { return JSON.parse(s); } catch { return null; }
    }).filter(Boolean);

    // Parse country scores [ "US:United States", "200", "IN:India", "45", ... ]
    const countries = [];
    const arr = countryData || [];
    for (let i = 0; i < arr.length; i += 2) {
      const [code, name] = arr[i].split(':');
      countries.push({ code, name, count: parseInt(arr[i+1], 10) });
    }

    return res.status(200).json({ visitors, countries });
  } catch (err) {
    console.error('[visitors]', err);
    return res.status(500).json({ error: err.message });
  }
}
