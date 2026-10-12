// GET /api/config-check
// Reports non-secret configuration checks; never returns Client Key or Secret.
function isPlaceholder(value) {
  return !value || /^(isi_|your_|replace_|change[_ -]?me|<|\{)/i.test(value.trim());
}

module.exports = (req, res) => {
  const clientKey = String(process.env.TIKTOK_CLIENT_KEY || '').trim();
  const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || '').trim();
  const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || '').trim();
  const scopes = String(process.env.TIKTOK_SCOPES || 'user.info.basic,video.upload,video.publish')
    .split(',').map(scope => scope.trim()).filter(Boolean);

  let parsedRedirect = null;
  try { parsedRedirect = new URL(redirectUri); } catch (_) {}

  const redirectUriPath = parsedRedirect ? parsedRedirect.pathname : null;
  const checks = {
    clientKeySet: Boolean(clientKey),
    clientKeyNotPlaceholder: Boolean(clientKey) && !isPlaceholder(clientKey),
    clientKeyNoWhitespace: Boolean(clientKey) && !/\s/.test(clientKey),
    clientSecretSet: Boolean(clientSecret),
    clientSecretNotPlaceholder: Boolean(clientSecret) && !isPlaceholder(clientSecret),
    redirectUriIsHttps: Boolean(parsedRedirect && parsedRedirect.protocol === 'https:'),
    redirectUriHasNoQueryOrHash: Boolean(parsedRedirect && !parsedRedirect.search && !parsedRedirect.hash),
    redirectUriEndsWithCallback: Boolean(parsedRedirect && redirectUriPath.replace(/\/$/, '') === '/api/callback'),
    scopesConfigured: scopes.length > 0
  };

  const ok = Object.values(checks).every(Boolean);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(ok ? 200 : 500).json({
    ok,
    checks,
    redirectUriHost: parsedRedirect ? parsedRedirect.host : null,
    redirectUriPath,
    requestedScopes: scopes,
    note: 'Pemeriksaan ini hanya memvalidasi Environment Variables dan format URL. Cocokkan host + path Redirect URI dengan Login Kit > Web pada app TikTok yang sama. Endpoint ini tidak dapat membuktikan Client Key aktif, app berstatus Live, atau scope sudah disetujui.'
  });
};
