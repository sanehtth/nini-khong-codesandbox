exports.handler = async () => {
  const v = process.env.ADMIN_SECRET || process.env.admin_secret || '';
  return {
    statusCode: 200,
    headers: { 'Content-Type':'application/json', 'Cache-Control':'no-store' },
    body: JSON.stringify({ ok: true, hasAdminSecret: !!v, len: v.length })
  };
};
