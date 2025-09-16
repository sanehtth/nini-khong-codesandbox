// netlify/edge-functions/admin-guard.js
export default async (request, context) => {
  const url = new URL(request.url);

  // Cho phép vào trang login & file tĩnh phục vụ login
  if (
    url.pathname === "/admin/login.html" ||
    url.pathname.startsWith("/admin/assets/") ||
    url.pathname.startsWith("/admin/_")
  ) {
    return context.next();
  }

  // Kiểm tra cookie admin
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split(";").map(s => s.trim()).find(s => s.startsWith("nf_admin="));

  if (!token) {
    return Response.redirect(`${url.origin}/admin/login.html`, 302);
  }

  // (Tùy bạn) Có thể verify chữ ký / TTL của token ở đây.
  return context.next();
};
