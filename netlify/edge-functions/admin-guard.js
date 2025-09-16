// netlify/edge-functions/admin-guard.js
export default async (request, context) => {
  const url = new URL(request.url);

  // Cho phép màn login & file tĩnh của màn login
  if (url.pathname.startsWith('/admin/login')) return context.next();

  // Đọc cookie
  const cookie = request.headers.get('cookie') || '';
  const hasToken = /(?:^|;\s*)admin_token=/.test(cookie);

  // Không có cookie -> chuyển về login
  if (!hasToken) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/login.html' }
    });
  }

  return context.next(); // Có cookie thì cho qua
};

// Tùy chọn: khẳng định path từ code (phòng quên netlify.toml)
export const config = { path: ['/admin', '/admin/*'] };
