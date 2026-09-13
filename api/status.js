// GET /api/status?publishId=...
// Optional: poll this to check whether TikTok finished processing the post.

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

  const { publishId } = req.query;
  if (!publishId) {
    res.status(400).json({ error: 'publishId wajib diisi.' });
    return;
  }

  try {
    const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${result.session.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({ publish_id: publishId })
    });
    const statusData = await statusRes.json();
    res.status(200).json(statusData.data || {});
  } catch (e) {
    res.status(500).json({ error: 'Gagal mengambil status posting.' });
  }
};
