const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function parseDevice(ua) {
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function parseBrowser(ua) {
  if (/edg\//i.test(ua))     return 'Edge';
  if (/opr\//i.test(ua))     return 'Opera';
  if (/chrome/i.test(ua))    return 'Chrome';
  if (/firefox/i.test(ua))   return 'Firefox';
  if (/safari/i.test(ua))    return 'Safari';
  return 'Other';
}

function parseOS(ua) {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua))   return 'macOS';
  if (/android/i.test(ua))    return 'Android';
  if (/iphone|ipad/i.test(ua))return 'iOS';
  if (/linux/i.test(ua))      return 'Linux';
  return 'Other';
}

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd, ...args]),
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Redis not configured' });
  }

  try {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
              || req.socket?.remoteAddress
              || '0.0.0.0';

    const ua = req.headers['user-agent'] || '';
    const { page = '/', referrer = '' } = req.body || {};

    // IP geolocation via ipapi.co (free, 30k/day)
    let geo = {};
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { 'User-Agent': 'optate-admin/1.0' },
      });
      geo = await geoRes.json();
    } catch (_) {}

    const visitor = {
      ip,
      country:   geo.country_name  || 'Unknown',
      countryCode: geo.country_code || '',
      city:      geo.city          || '',
      region:    geo.region        || '',
      lat:       geo.latitude      || 0,
      lon:       geo.longitude     || 0,
      timezone:  geo.timezone      || '',
      isp:       geo.org           || '',
      device:    parseDevice(ua),
      browser:   parseBrowser(ua),
      os:        parseOS(ua),
      page,
      referrer,
      ts: new Date().toISOString(),
    };

    // LPUSH to Redis list, keep last 500
    await redis('LPUSH', 'optate:visitors', JSON.stringify(visitor));
    await redis('LTRIM', 'optate:visitors', 0, 499);

    // Increment country counter
    if (visitor.countryCode) {
      await redis('ZINCRBY', 'optate:countries', 1, visitor.countryCode + ':' + visitor.country);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[track]', err);
    return res.status(500).json({ error: err.message });
  }
}
