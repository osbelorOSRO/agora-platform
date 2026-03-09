const API_BASE_URL = import.meta.env.VITE_API_URL;
const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL;

export function normalizeMediaUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (!API_BASE_URL || !MEDIA_BASE_URL) return raw;

    const apiBase = new URL(API_BASE_URL);
    const mediaBase = new URL(MEDIA_BASE_URL);

    if (url.origin === apiBase.origin && apiBase.origin !== mediaBase.origin) {
      return `${mediaBase.origin}${url.pathname}${url.search}${url.hash}`;
    }

    return raw;
  } catch {
    return raw;
  }
}
