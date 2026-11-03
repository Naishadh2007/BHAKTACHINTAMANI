// Only try alternate routes when the configured route is unavailable.
export async function requestAdminLogin(client, base, email, password) {
  const root = base.replace(/\/+$/, '');
  const urls = [`${root}/api/admin/login`, `${root}/api_admin.php?action=login`];
  for (const url of urls) {
    let response;
    try {
      response = await client.post(url, { email: email.trim().toLowerCase(), password }, {
        timeout: 15000,
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      if ([400, 401, 403, 422, 429].includes(status)) {
        throw new Error(data?.errors?.email?.[0] || data?.errors?.password?.[0]
          || data?.message || (status === 429 ? 'Too many attempts. Please try again later.' : 'Invalid email or password.'));
      }
      if (status === 404 || status === 405) continue;
      throw new Error('Login service is temporarily unavailable. Please try again.');
    }
    const data = response.data;
    if (data && typeof data.token === 'string' && data.token && data.admin?.id) return data;
    // Static hosts can return the SPA HTML for an unknown API route.
  }
  throw new Error('Login service returned an invalid response. Please try again.');
}
