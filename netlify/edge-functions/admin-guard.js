export default async (request, context) => {
  const secret = context.env?.ADMIN_SECRET || "";
  const cookieVal = request.headers.get("cookie") || "";
  const match = cookieVal.match(/(?:^|;\s*)nini_admin=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : "";

  const ok = token && secret && token === secret;

  if (!ok) {
    const url = new URL("/admin/login.html", request.url);
    return Response.redirect(url, 302);
  }
  return context.next();
};
