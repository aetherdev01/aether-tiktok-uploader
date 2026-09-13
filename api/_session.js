// Shared helper: read the session cookie, and transparently refresh the
// access token if it's expired (refresh doesn't require user interaction,
// but does require the Client Secret — hence this lives server-side too).

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

function readSessionRaw(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.tt_session) return null;
  try {
    return JSON.parse(Buffer.from(cookies.tt_session, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function refreshAccessToken(session) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken
    })
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error('refresh_failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    openId: data.open_id,
    expiresAt: Date.now() + (data.expires_in * 1000),
    refreshExpiresAt: Date.now() + ((data.refresh_expires_in || 31536000) * 1000)
  };
}

function serializeSessionCookie(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64');
  return `tt_session=${payload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;
}

// Returns { session, refreshedCookie } or null if not logged in / unrecoverable.
async function getValidSession(req) {
  const session = readSessionRaw(req);
  if (!session) return null;

  if (Date.now() < session.expiresAt - 60000) {
    return { session, refreshedCookie: null };
  }

  if (Date.now() > session.refreshExpiresAt) {
    return null; // fully expired, user must log in again
  }

  try {
    const refreshed = await refreshAccessToken(session);
    return { session: refreshed, refreshedCookie: serializeSessionCookie(refreshed) };
  } catch (e) {
    return null;
  }
}

module.exports = { getValidSession, serializeSessionCookie };
