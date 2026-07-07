/**
 * Cookie utility functions using manual document.cookie approach
 * Replaces js-cookie dependency for better consistency
 */

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return;

  const prefix = `${name}=`;
  const matches = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(prefix));

  const cookieValue = matches.at(-1)?.slice(prefix.length);
  if (cookieValue) {
    try {
      return decodeURIComponent(cookieValue);
    } catch {
      return cookieValue;
    }
  }
  return;
}

function getCookieDomainCandidates(): string[] {
  if (typeof window === "undefined") return [];

  const hostname = window.location.hostname;
  if (!hostname || hostname === "localhost" || /^[\d.]+$/.test(hostname)) {
    return [];
  }

  const parts = hostname.split(".").filter(Boolean);
  const rootDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

  return Array.from(
    new Set([hostname, `.${hostname}`, rootDomain, `.${rootDomain}`])
  );
}

/**
 * Set a cookie with name, value, and optional max age
 */
export function setCookie(
  name: string,
  value: string,
  maxAge: number = DEFAULT_MAX_AGE
): void {
  if (typeof document === "undefined") return;

  removeCookie(name);
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}`;
}

/**
 * Remove a cookie by setting its max age to 0
 */
export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; path=/; max-age=0`;
  for (const domain of getCookieDomainCandidates()) {
    document.cookie = `${name}=; path=/; domain=${domain}; max-age=0`;
  }
}
