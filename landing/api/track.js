function parseDevice(ua) {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
}
function parseBrowser(ua) {
  if (/edg\//i.test(ua))   return 'Edge';
  if (/opr\//i.test(ua))   return 'Opera';
  if (/chrome/i.test(ua))  return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua))  return 'Safari';
  return 'Other';
}
function parseOS(ua) {
  if (/windows nt/i.test(ua))   return 'Windows';
  if (/mac os x/i.test(ua))     return 'macOS';
  if (/android/i.test(ua))      return 'Android';
  if (/iphone|ipad/i.test(ua))  return 'iOS';
  if (/linux/i.test(ua))        return 'Linux';
  return 'Other';
}

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
    const ip = ((req.headers['x-forwarded-for'] || '') + '')
      .split(',')[0].trim() || '0.0.0.0';
    const ua = req.headers['user-agent'] || '';
    const body = req.body || {};
    const page     = body.page     || '/';
    const referrer = body.referrer || '';

    // Geo lookup
    let geo = {};
    try {
      const g = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { 'User-Agent': 'optate-analytics/1.0' },
      });
      geo = await g.json();
    } catch (_) {}

    const visitor = JSON.stringify({
      ip,
      country:     geo.country_name || 'Unknown',
      countryCode: geo.country_code || '',
      city:        geo.city         || '',
      region:      geo.region       || '',
      lat:         geo.latitude     || 0,
      lon:         geo.longitude    || 0,
      timezone:    geo.timezone     || '',
      isp:         geo.org          || '',
      device:      parseDevice(ua),
      browser:     parseBrowser(ua),
      os:          parseOS(ua),
      page,
      referrer,
      ts:          new Date().toISOString(),
    });

    await redis(REDIS_URL, REDIS_TOKEN, 'LPUSH', 'optate:visitors', visitor);
    await redis(REDIS_URL, REDIS_TOKEN, 'LTRIM', 'optate:visitors', 0, 499);
    if (geo.country_code) {
      await redis(REDIS_URL, REDIS_TOKEN, 'ZINCRBY', 'optate:countries', 1,
        geo.country_code + ':' + (geo.country_name || ''));
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track]', err);
    return res.status(500).json({ error: err.message });
  }
};
