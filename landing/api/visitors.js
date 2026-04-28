async function redis(url, token, ...command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

function extractDomain(referrer) {
  try {
    if (!referrer) return '';
    const u = new URL(referrer);
    return u.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
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
      redis(REDIS_URL, REDIS_TOKEN, 'LRANGE', 'optate:visitors', 0, 499),
      redis(REDIS_URL, REDIS_TOKEN, 'ZREVRANGE', 'optate:countries', 0, 19, 'WITHSCORES'),
      redis(REDIS_URL, REDIS_TOKEN, 'ZREVRANGE', 'optate:referrers', 0, 49, 'WITHSCORES'),
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

    // Build referrer map: start from sorted-set data (long-term aggregates)
    const refMap = {};
    const rarr = referrerRaw || [];
    for (let i = 0; i < rarr.length; i += 2) {
      const domain = rarr[i];
      if (domain) refMap[domain] = parseInt(rarr[i + 1], 10) || 0;
    }

    // Supplement / backfill from the recent visitor records (covers all existing data)
    visitors.forEach(v => {
      const domain = extractDomain(v.referrer || '');
      if (domain) {
        // Only add if not already counted by the sorted set
        // (sorted set has authoritative long-term counts; visitor list is recent 500)
        if (!(domain in refMap)) refMap[domain] = 0;
        // If sorted set is empty entirely, count from visitor records directly
        if (rarr.length === 0) refMap[domain]++;
      }
    });

    const referrers = Object.entries(refMap)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return res.status(200).json({ visitors, countries, referrers });
  } catch (err) {
    console.error('[visitors]', err);
    return res.status(500).json({ error: err.message });
  }
};
