// GET /api/session
// Tells the browser whether it's logged in, without ever exposing the token itself.

const { getValidSession } = require('./_session');

module.exports = async (req, res) => {
  const result = await getValidSession(req);

  if (!result) {
    res.status(200).json({ connected: false });
    return;
  }

  if (result.refreshedCookie) {
    res.setHeader('Set-Cookie', [result.refreshedCookie]);
  }

  // Fetch basic profile info for display purposes.
  let displayName = 'Akun TikTok';
  try {
    const profileRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name', {
      headers: { Authorization: `Bearer ${result.session.accessToken}` }
    });
    const profileData = await profileRes.json();
    if (profileData.data && profileData.data.user && profileData.data.user.display_name) {
      displayName = profileData.data.user.display_name;
    }
  } catch (e) {
    // non-fatal — just show a generic label
  }

  res.status(200).json({
    connected: true,
    openId: result.session.openId,
    displayName
  });
};
