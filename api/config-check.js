// GET /api/config-check
// Reports only configuration checks; never returns the Client Key or Client Secret.
function isPlaceholder(value) {
  return !value || /^(isi_|your_|replace_|change[_ -]?me|<|\{)/i.test(value.trim());
}

module.exports = (req, res) => {
  const clientKey = String(process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || '').trim();

  let parsedRedirect = null;
  try { parsedRedirect = new URL(redirectUri); } catch (_) {}

  const checks = {
    clientKeySet: Boolean(clientKey),
    clientKeyNotPlaceholder: Boolean(clientKey) && !isPlaceholder(clientKey),
    clientKeyNoWhitespace: Boolean(clientKey) && !/\s/.test(clientKey),
    clientSecretSet: Boolean(clientSecret),
    clientSecretNotPlaceholder: Boolean(clientSecret) && !isPlaceholder(clientSecret),
    redirectUriIsHttps: Boolean(parsedRedirect && parsedRedirect.protocol === 'https:'),
    redirectUriHasNoQueryOrHash: Boolean(parsedRedirect && !parsedRedirect.search && !parsedRedirect.hash),
    redirectUriEndsWithCallback: Boolean(parsedRedirect && parsedRedirect.pathname.replace(/\/$/, '') === '/api/callback')
  };

  const ok = Object.values(checks).every(Boolean);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(ok ? 200 : 500).json({
    ok,
    checks,
    note: 'Pemeriksaan ini hanya memvalidasi Environment Variables. Ini tidak dapat memastikan Client Key benar/aktif atau Redirect URI sudah terdaftar di TikTok Developer Portal.'
  });
};
