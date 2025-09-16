export const handler = async () => {
  const cookie = [
    'nf_admin=',
    'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax',
    'Max-Age=0'
  ].join('; ');

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
