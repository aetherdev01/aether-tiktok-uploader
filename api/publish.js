// POST /api/publish
// Body: { videoSize, caption, privacyLevel }
// Uses the server-side access token to initialize a direct post with TikTok's
// Content Posting API, then hands the browser a short-lived upload_url so the
// video bytes can go straight from the phone to TikTok (not through our server).

const { getValidSession } = require('./_session');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await getValidSession(req);
  if (!result) {
    res.status(401).json({ error: 'Belum login atau sesi kedaluwarsa. Silakan login ulang.' });
    return;
  }
  if (result.refreshedCookie) {
    res.setHeader('Set-Cookie', [result.refreshedCookie]);
  }

  const { videoSize, caption, privacyLevel } = req.body || {};

  if (!videoSize || typeof videoSize !== 'number') {
    res.status(400).json({ error: 'Ukuran video tidak valid.' });
    return;
  }

  try {
    // Direct Post: publishes to the creator's profile (subject to privacyLevel
    // and app audit status — unaudited apps are restricted to SELF_ONLY / draft).
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${result.session.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        post_info: {
          title: caption || '',
          privacy_level: privacyLevel || 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1
        }
      })
    });

    const initData = await initRes.json();

    if (!initRes.ok || (initData.error && initData.error.code !== 'ok')) {
      res.status(400).json({
        error: initData.error ? initData.error.message : 'Gagal menginisialisasi upload ke TikTok.'
      });
      return;
    }

    res.status(200).json({
      publishId: initData.data.publish_id,
      uploadUrl: initData.data.upload_url
    });

  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan server saat menghubungi TikTok.' });
  }
};
