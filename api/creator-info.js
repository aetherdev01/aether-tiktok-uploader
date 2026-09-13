// GET /api/creator-info
// TikTok requires querying the creator's allowed privacy levels before posting
// (some accounts/regions can't post PUBLIC_TO_EVERYONE via API, for example).

const { getValidSession } = require('./_session');

module.exports = async (req, res) => {
  const result = await getValidSession(req);
  if (!result) {
    res.status(401).json({ error: 'Belum login.' });
    return;
  }
  if (result.refreshedCookie) {
    res.setHeader('Set-Cookie', [result.refreshedCookie]);
  }

  try {
    const infoRes = await fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${result.session.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      }
    });
    const infoData = await infoRes.json();

    if (!infoRes.ok || (infoData.error && infoData.error.code !== 'ok')) {
      res.status(200).json({ privacyLevelOptions: ['SELF_ONLY'] });
      return;
    }

    res.status(200).json({
      privacyLevelOptions: infoData.data.privacy_level_options || ['SELF_ONLY'],
      creatorNickname: infoData.data.creator_nickname
    });
  } catch (e) {
    res.status(200).json({ privacyLevelOptions: ['SELF_ONLY'] });
  }
};
