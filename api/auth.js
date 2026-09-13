// GET /api/auth
// Redirects the user to TikTok's real login/consent screen.
// No secrets are used here — this step is safe to trigger from the browser.

const crypto = require('crypto');

module.exports = (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI; // e.g. https://your-app.vercel.app/api/callback

  if (!clientKey || !redirectUri) {
    res.status(500).send('Server belum dikonfigurasi: TIKTOK_CLIENT_KEY / TIKTOK_REDIRECT_URI belum diset.');
    return;
  }

  // CSRF protection: random state, stored in a short-lived cookie, checked in /api/callback.
  const state = crypto.randomBytes(16).toString('hex');

  const scope = ['user.info.basic', 'video.upload', 'video.publish'].join(',');

  const authorizeUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authorizeUrl.searchParams.set('client_key', clientKey);
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);

  res.setHeader('Set-Cookie', [
    `tt_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  ]);
  res.writeHead(302, { Location: authorizeUrl.toString() });
  res.end();
};
