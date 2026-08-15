const dns = require('node:dns/promises');
const net = require('node:net');
const { z } = require('zod');

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
  '.home.arpa',
  '.lan',
  '.corp',
];

const urlSchema = z
  .string({ message: 'URL is required.' })
  .trim()
  .min(1, 'URL is required.')
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return ALLOWED_PROTOCOLS.has(parsed.protocol) && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }, {
    message: 'Please enter a valid http:// or https:// URL.',
  });

function normalizeHostname(hostname) {
  return String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
}

function isPrivateOrLocalIpv4(ip) {
  const parts = String(ip).split('.');

  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((part) => Number(part));

  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 203 && second === 0 && octets[2] === 113)
  );
}

function isPrivateOrLocalIpv6(ip) {
  const value = normalizeHostname(ip).toLowerCase();

  if (!value || value === '::' || value === '::1') {
    return true;
  }

  if (value.startsWith('::ffff:')) {
    return isPrivateOrLocalIpv4(value.replace('::ffff:', ''));
  }

  return (
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    value.startsWith('fe8') ||
    value.startsWith('fe9') ||
    value.startsWith('fea') ||
    value.startsWith('feb')
  );
}

function isBlockedIpAddress(ip) {
  const value = normalizeHostname(ip);

  if (!value) {
    return false;
  }

  if (net.isIP(value) === 4) {
    return isPrivateOrLocalIpv4(value);
  }

  if (net.isIP(value) === 6) {
    return isPrivateOrLocalIpv6(value);
  }

  return false;
}

function isBlockedHostname(hostname) {
  const host = normalizeHostname(hostname);

  if (!host) {
    return true;
  }

  if (host === 'localhost' || host === 'localhost.') {
    return true;
  }

  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function checkUrlSafety(url) {
  if (!(url instanceof URL)) {
    return { safe: false, reason: 'The value is not a valid URL object.' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { safe: false, reason: 'Only http:// and https:// URLs are allowed.' };
  }

  if (!url.hostname) {
    return { safe: false, reason: 'A hostname is required.' };
  }

  if (url.username || url.password) {
    return { safe: false, reason: 'URL credentials are not allowed.' };
  }

  const hostname = normalizeHostname(url.hostname);

  if (isBlockedHostname(hostname)) {
    return {
      safe: false,
      reason: 'This hostname is private, local, or not safe to visit from a public SEO crawler.',
    };
  }

  if (net.isIP(hostname) !== 0) {
    if (isBlockedIpAddress(hostname)) {
      return {
        safe: false,
        reason: 'This IP address belongs to a private or loopback network and is not safe to visit.',
      };
    }

    return { safe: true, reason: 'Public IP address is allowed.' };
  }

  return { safe: true, reason: 'The hostname does not appear to be local or private.' };
}

function validateSeoUrlSync(input) {
  const parsed = urlSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      safe: false,
      error: parsed.error.issues[0]?.message || 'Invalid URL.',
    };
  }

  const url = new URL(parsed.data);
  const safety = checkUrlSafety(url);

  if (!safety.safe) {
    return {
      ok: false,
      safe: false,
      error: safety.reason,
      url: url.toString(),
    };
  }

  return {
    ok: true,
    safe: true,
    url: url.toString(),
    hostname: url.hostname,
  };
}

async function validateSeoUrl(input) {
  const parsed = urlSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      safe: false,
      error: parsed.error.issues[0]?.message || 'Invalid URL.',
    };
  }

  const url = new URL(parsed.data);
  const safety = checkUrlSafety(url);

  if (!safety.safe) {
    return {
      ok: false,
      safe: false,
      error: safety.reason,
      url: url.toString(),
    };
  }

  try {
    const resolvedAddresses = await dns.lookup(url.hostname, { all: true });
    const blocked = resolvedAddresses.some(({ address }) => isBlockedIpAddress(address));

    if (blocked) {
      return {
        ok: false,
        safe: false,
        error: 'The hostname resolves to a private or local address, which is unsafe for crawling.',
        url: url.toString(),
      };
    }

    return {
      ok: true,
      safe: true,
      url: url.toString(),
      hostname: url.hostname,
      resolvedIps: resolvedAddresses.map(({ address }) => address),
    };
  } catch (error) {
    return {
      ok: false,
      safe: false,
      error: 'The hostname could not be resolved safely for SSRF protection.',
      url: url.toString(),
    };
  }
}

module.exports = {
  urlSchema,
  validateSeoUrl,
  validateSeoUrlSync,
  checkUrlSafety,
};
