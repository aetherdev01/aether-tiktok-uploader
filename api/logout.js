// POST /api/logout
module.exports = (req, res) => {
  res.setHeader('Set-Cookie', [
    `tt_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  ]);
  res.status(200).json({ ok: true });
};
