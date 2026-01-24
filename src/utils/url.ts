/** Check if a string is a valid HTTP/HTTPS URL */
export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Private IPv4 ranges and special addresses:
 * - 127.0.0.0/8 (loopback)
 * - 10.0.0.0/8 (private)
 * - 192.168.0.0/16 (private)
 * - 172.16.0.0/12 (private)
 * - 169.254.0.0/16 (link-local)
 * - 0.0.0.0/8 (current network)
 * - 100.64.0.0/10 (carrier-grade NAT)
 * - 192.0.0.0/24 (IETF protocol assignments)
 * - 192.0.2.0/24 (TEST-NET-1)
 * - 198.51.100.0/24 (TEST-NET-2)
 * - 203.0.113.0/24 (TEST-NET-3)
 * - 198.18.0.0/15 (benchmarking)
 * - 240.0.0.0/4 (reserved)
 * - 255.255.255.255 (broadcast)
 */
const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^198\.1[89]\./,
  /^240\./,
  /^255\.255\.255\.255$/,
];

/** Private/internal hostnames */
const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
]);

/** Check if hostname is an IPv4 address */
const isIPv4 = (hostname: string): boolean => {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
};

/** Check if hostname is an IPv6 address */
const isIPv6 = (hostname: string): boolean => hostname.includes(":");

/** Check if IPv6 is loopback (::1) */
const isIPv6Loopback = (addr: string): boolean =>
  addr === "::1" || addr === "0:0:0:0:0:0:0:1";

/** Check if IPv6 is link-local (fe80::/10) or unique local (fc00::/7) */
const isIPv6LocalRange = (addr: string): boolean =>
  addr.startsWith("fe80:") ||
  addr.startsWith("fe8") ||
  addr.startsWith("fc") ||
  addr.startsWith("fd");

/** Check if IPv4-mapped IPv6 address points to private IPv4 */
const isPrivateIPv4Mapped = (addr: string): boolean => {
  const match = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return match !== null && isPrivateIPv4(match[1]);
};

/** Check if IPv4 address is in a private range */
const isPrivateIPv4 = (hostname: string): boolean =>
  PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));

/** Check if IPv6 address is private/internal */
const isPrivateIPv6 = (hostname: string): boolean => {
  const addr = hostname.toLowerCase();
  return (
    isIPv6Loopback(addr) || isIPv6LocalRange(addr) || isPrivateIPv4Mapped(addr)
  );
};

/** Check if hostname uses internal TLDs (.local, .internal) */
const isInternalTld = (hostname: string): boolean =>
  hostname.endsWith(".local") || hostname.endsWith(".internal");

/** Check if hostname is private based on its type (hostname, IPv4, or IPv6) */
const isPrivateHostname = (hostname: string): boolean => {
  if (PRIVATE_HOSTNAMES.has(hostname) || isInternalTld(hostname)) {
    return true;
  }
  if (isIPv4(hostname)) {
    return isPrivateIPv4(hostname);
  }
  if (isIPv6(hostname)) {
    return isPrivateIPv6(hostname);
  }
  return false;
};

/** Check if URL points to a private/internal network */
export const isPrivateUrl = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return isPrivateHostname(hostname);
  } catch {
    return true;
  }
};

/** Validate URL is safe to fetch (http/https, not private) */
export const isSafeUrl = (url: string): boolean =>
  isValidUrl(url) && !isPrivateUrl(url);

const resolveProtocolRelative = (url: string, baseUrl: string): string => {
  try {
    return `${new URL(baseUrl).protocol}${url}`;
  } catch {
    return `https:${url}`;
  }
};

/** Resolve a potentially relative URL against a base URL */
export const resolveUrl = (url: string, baseUrl?: string): string => {
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("//")) {
    return baseUrl ? resolveProtocolRelative(url, baseUrl) : `https:${url}`;
  }

  if (!baseUrl) {
    return url;
  }

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
};

/** Normalize a URL (lowercase protocol/host, remove trailing slash if no query) */
export const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let normalized = `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}`;
    if (parsed.pathname !== "/") {
      normalized += parsed.pathname;
    }
    if (!parsed.search && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    const result = normalized + parsed.search + parsed.hash;
    return result || url;
  } catch {
    return url;
  }
};

/** Extract base URL (protocol + host) from a full URL */
export const getBaseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
};
