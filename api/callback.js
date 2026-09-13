// GET /api/callback?code=...&state=...
// TikTok redirects here after the user logs in and approves the app.
// This is the ONLY place the Client Secret is used — it never reaches the browser.

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  });
  return out;
}

module.exports = async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    res.status(400).send(`Login TikTok dibatalkan atau gagal: ${error}`);
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!code || !state || state !== cookies.tt_oauth_state) {
    res.status(400).send('Permintaan tidak valid atau kedaluwarsa (state mismatch). Coba login ulang.');
    return;
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      res.status(400).send(`Gagal menukar kode otorisasi: ${tokenData.error_description || tokenData.error || 'unknown error'}`);
      return;
    }

    // Store tokens in an httpOnly cookie so the browser JS can never read them directly.
    // For real production use, prefer storing this server-side (e.g. a database keyed
    // by a session id) rather than in the cookie itself, and encrypt it. This is the
    // minimal version for a personal single-user tool.
    const sessionPayload = Buffer.from(JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      openId: tokenData.open_id,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      refreshExpiresAt: Date.now() + (tokenData.refresh_expires_in * 1000)
    })).toString('base64');

    res.setHeader('Set-Cookie', [
      `tt_session=${sessionPayload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`,
      `tt_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
    ]);

    res.writeHead(302, { Location: '/' });
    res.end();

  } catch (err) {
    res.status(500).send('Terjadi kesalahan server saat login TikTok. Coba lagi.');
  }
};
