function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-PRY-Officer-Key',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return allowed.includes(origin.replace(/\/$/, '')) ? origin : '';
}

async function equalSecret(left, right) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(left || ''))),
    crypto.subtle.digest('SHA-256', encoder.encode(String(right || ''))),
  ]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let difference = aa.length ^ bb.length;
  for (let index = 0; index < Math.min(aa.length, bb.length); index++) difference |= aa[index] ^ bb[index];
  return difference === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ok: true, service: 'PRY Attendance API Proxy'}, 200, '*');
    }

    const origin = allowedOrigin(request, env);
    if (!origin) return json({ok: false, error: 'Origin is not allowed.'}, 403, 'null');
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-PRY-Officer-Key',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        },
      });
    }
    if (request.method !== 'POST' || url.pathname !== '/api') {
      return json({ok: false, error: 'Not found.'}, 404, origin);
    }

    const officerKey = request.headers.get('X-PRY-Officer-Key') || '';
    if (!env.OFFICER_KEY || !(await equalSecret(officerKey, env.OFFICER_KEY))) {
      return json({ok: false, error: 'Invalid officer access key.'}, 401, origin);
    }
    if (!env.GAS_WEB_APP_URL || !env.GAS_SHARED_SECRET) {
      return json({ok: false, error: 'The API proxy is not fully configured.'}, 503, origin);
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return json({ok: false, error: 'Invalid JSON request.'}, 400, origin);
    }
    if (!requestBody || typeof requestBody.fn !== 'string' || !Array.isArray(requestBody.args)) {
      return json({ok: false, error: 'Invalid API request.'}, 400, origin);
    }

    try {
      const upstream = await fetch(env.GAS_WEB_APP_URL, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=UTF-8'},
        body: JSON.stringify({
          apiSecret: env.GAS_SHARED_SECRET,
          fn: requestBody.fn,
          args: requestBody.args,
        }),
        redirect: 'follow',
      });
      const text = await upstream.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`Apps Script returned an unexpected response (${upstream.status}).`);
      }
      const status = payload.ok ? 200 : payload.code === 'UNAUTHORIZED' ? 502 : 400;
      return json(payload, status, origin);
    } catch (error) {
      return json({ok: false, error: error.message || String(error)}, 502, origin);
    }
  },
};
