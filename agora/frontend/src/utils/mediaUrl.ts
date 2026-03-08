const SOURCE_HOST = "api.llevatuplan.cl";
const TARGET_ORIGIN = "http://apist.zaldio.qzz.io";

export function normalizeMediaUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.hostname === SOURCE_HOST) {
      return `${TARGET_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    }
    return raw;
  } catch {
    return raw;
  }
}

