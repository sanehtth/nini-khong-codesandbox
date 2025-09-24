// NOTE: WhoAmI – server kiểm tra cookie nini_admin có mặt hay không.
// Dùng bởi trang login để chắc chắn cookie đã được trình duyệt lưu.
// --------- START ----------
exports.handler = async (event) => {
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const isAdmin = /(?:^|;\s*)nini_admin=1\b/.test(cookie);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control':'no-store' },
    body: JSON.stringify({ ok: true, admin: isAdmin })
  };
};
// --------- END ----------
