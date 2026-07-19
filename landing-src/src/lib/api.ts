declare global {
  interface Window {
    DMS_API?: {
      baseUrl: string;
      url: (path: string) => string;
      fetch: typeof fetch;
    };
  }
}

export function apiUrl(path: string) {
  return window.DMS_API?.url(path) || path;
}

export async function readJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: unknown = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `الخادم أعاد استجابة غير صالحة (HTTP ${res.status}) / Invalid server response (HTTP ${res.status})`
      );
    }
    throw new Error(text || 'استجابة الخادم ليست JSON / Server response is not JSON');
  }

  if (!res.ok) {
    const error = typeof data === 'object' && data && 'error' in data ? String(data.error) : `HTTP ${res.status}`;
    throw new Error(error);
  }
  return data as T;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return readJson<T>(await fetch(path, init));
}

export function safeNextPath(value: string | null, fallback = '/products') {
  if (!value || !value.startsWith('/') || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch (err) {
    return fallback;
  }
}
