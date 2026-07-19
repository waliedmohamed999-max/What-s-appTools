(function configureDmsApi() {
  const configuredValue = String(window.DMS_CONFIG?.apiBaseUrl || '').trim().replace(/\/+$/, '');
  let baseUrl = '';

  if (configuredValue) {
    try {
      const parsed = new URL(configuredValue, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported API protocol');
      baseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '');
    } catch (error) {
      console.error('Invalid DMS API URL:', error);
    }
  }

  const originalFetch = window.fetch.bind(window);
  let redirectingToLogin = false;
  const isBackendPath = (value) => /^\/(api|uploads)(\/|$)/.test(value);
  const apiUrl = (value) => {
    const path = String(value || '');
    return baseUrl && isBackendPath(path) ? `${baseUrl}${path}` : path;
  };

  async function dmsFetch(input, init) {
    const requestPath = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const target = isBackendPath(requestPath) ? apiUrl(requestPath) : input;
    const options = { credentials: 'include', ...(init || {}) };
    const response = await originalFetch(target, options);

    const isAuthRequest = /^\/api\/auth\/(me|login|register|logout)$/.test(requestPath);
    if (response.status === 401 && !isAuthRequest && !redirectingToLogin) {
      redirectingToLogin = true;
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
    return response;
  }

  window.DMS_API = Object.freeze({ baseUrl, url: apiUrl, fetch: dmsFetch });
  window.fetch = dmsFetch;
})();
