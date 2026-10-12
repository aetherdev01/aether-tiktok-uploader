// GET /api/auth
// Redirects the user to TikTok's official OAuth authorization page.
const crypto = require('crypto');

function isPlaceholder(value) {
  return !value || /^(isi_|your_|replace_|change[_ -]?me|<|\{)/i.test(value.trim());
}

function parseScopes(value) {
  const raw = String(value || 'user.info.basic,video.upload,video.publish');
  return [...new Set(raw.split(',').map(scope => scope.trim()).filter(Boolean))];
}

module.exports = (req, res) => {
  const clientKey = String(process.env.TIKTOK_CLIENT_KEY || '').trim();
  const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || '').trim();
  const scopes = parseScopes(process.env.TIKTOK_SCOPES);

  const problems = [];
  if (isPlaceholder(clientKey)) {
    problems.push('TIKTOK_CLIENT_KEY kosong atau masih berupa contoh. Isi dengan Client Key dari aplikasi yang sama di TikTok Developer Portal.');
  } else if (/\s/.test(clientKey)) {
    problems.push('TIKTOK_CLIENT_KEY mengandung spasi/baris baru. Salin ulang nilainya tanpa spasi tambahan.');
  }

  let parsedRedirect = null;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch (_) {
    // Report below using a safe configuration message.
  }
  if (!parsedRedirect || parsedRedirect.protocol !== 'https:' || parsedRedirect.search || parsedRedirect.hash) {
    problems.push('TIKTOK_REDIRECT_URI harus berupa URL HTTPS absolut tanpa query/hash, misalnya https://domain-kamu.vercel.app/api/callback.');
  } else if (parsedRedirect.pathname.replace(/\/$/, '') !== '/api/callback') {
    problems.push('Path TIKTOK_REDIRECT_URI harus /api/callback, karena itu endpoint callback yang tersedia pada proyek ini.');
  }

  if (!scopes.length) {
    problems.push('TIKTOK_SCOPES kosong. Isi dengan scope yang sudah ditambahkan pada TikTok Developer Portal, dipisahkan koma.');
  }

  if (problems.length) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Konfigurasi login TikTok belum benar:\n\n- ' + problems.join('\n- ') + '\n\nPerbarui Environment Variables di Vercel, lalu Redeploy.');
    return;
  }

  // CSRF protection: random state stored in a short-lived cookie and checked in /api/callback.
  const state = crypto.randomBytes(24).toString('hex');
  const authorizeUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authorizeUrl.searchParams.set('client_key', clientKey);
  authorizeUrl.searchParams.set('scope', scopes.join(','));
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('state', state);

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', [
    `tt_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  ]);
  res.writeHead(302, { Location: authorizeUrl.toString() });
  res.end();
};
