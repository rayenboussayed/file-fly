import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { streamSizeTransform } from 'jutilities/node/stream/size';
import { request as netRequest } from 'undici';

import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { environment } from '@/environment.js';
import { SourceSchema } from '@/schema.js';
import { ByteCapTransform } from '@/utils/buffer.js';

/** Headers safe to forward to the remote origin; everything else is dropped. */
const FORWARDABLE_HEADERS = new Set(['accept', 'accept-language', 'user-agent']);

/** Hostnames always refused, regardless of EGRESS_ALLOWLIST. */
const REFUSED_HOSTNAMES = new Set(['localhost']);

/**
 * Parses a bare IPv4 literal into its octets, or undefined for anything else.
 * @param host - Lowercased bare host (no brackets).
 * @returns The four octets, or undefined when not an IPv4 literal.
 */
const ipv4Octets = (host: string): [number, number, number, number] | undefined => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return undefined;
  const [a, b, c, d] = match.slice(1).map(Number) as [number, number, number, number];
  return [a, b, c, d].some((octet) => octet > 255) ? undefined : [a, b, c, d];
};

/**
 * Whether an IPv4 literal sits in a loopback, private, link-local or CGNAT range.
 * @param octets - The four octets of the literal.
 * @returns True when the literal must not be fetched.
 */
const isPrivateIpv4 = (octets: [number, number, number, number]): boolean => {
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
};

/**
 * Turns two hextets holding an embedded IPv4 address into octets.
 * @param highHex - The high 16 bits in hexadecimal.
 * @param lowHex - The low 16 bits in hexadecimal.
 * @returns The four octets, or undefined when either hextet is missing.
 */
const octetsFromHextets = (
  highHex: string | undefined,
  lowHex: string | undefined,
): [number, number, number, number] | undefined => {
  if (highHex === undefined || lowHex === undefined) return undefined;
  const high = Number.parseInt(highHex, 16);
  const low = Number.parseInt(lowHex, 16);
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
};

/**
 * Extracts an embedded IPv4 address from the IPv6 forms Node canonicalizes:
 * IPv4-mapped and IPv4-translated (`::ffff:` with optional zero hextets),
 * IPv4-compatible (`::`), NAT64 well-known/local-use, and 6to4 (`2002:`, which
 * embeds the address in the first two hextets after the prefix).
 * @param host - Lowercased bare host without brackets.
 * @returns The four embedded octets, or undefined for any other host.
 */
const ipv4EmbeddedOctets = (host: string): [number, number, number, number] | undefined => {
  const tail = /^(?:::ffff:(?:0:){0,2}|::|64:ff9b:1::|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (tail) return octetsFromHextets(tail[1], tail[2]);
  const sixToFour = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})::(?:0:)*$/.exec(host);
  return sixToFour ? octetsFromHextets(sixToFour[1], sixToFour[2]) : undefined;
};

/**
 * Whether a bare IPv6 literal (already bracket-stripped) sits in ::1/::/fc00::/7/fe80::/10
 * or embeds a private IPv4 address in a recognized IPv4-embedding prefix.
 * @param host - Lowercased bare host without brackets.
 * @returns True when the literal must not be fetched.
 */
const isPrivateIpv6 = (host: string): boolean => {
  if (host === '::1' || host === '::' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host)) {
    return true;
  }
  const embedded = ipv4EmbeddedOctets(host);
  return embedded !== undefined && isPrivateIpv4(embedded);
};

/** Hostnames from EGRESS_ALLOWLIST, lowercased; empty = allowlist inactive. */
const EGRESS_ALLOWLIST = (environment.EGRESS_ALLOWLIST ?? []).map((entry) =>
  entry.toLowerCase(),);

/**
 * Enforces the egress rules for a user-supplied source URL:
 * scheme allowlist (http/https only), private/loopback-literal denial, and
 * the optional `EGRESS_ALLOWLIST` (exact host or dotted suffix).
 *
 * Note: DNS resolution is not interposed, so a public hostname that resolves
 * to a private address is out of scope; `EGRESS_ALLOWLIST` is the control for
 * such deployments.
 * @param url - The parsed source URL.
 * @throws BadRequestException When the URL fails the egress rules.
 */
const assertEgressAllowed = (url: URL): void => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException({
      code: 'SOURCE_SCHEME_NOT_ALLOWED',
      message: 'source must use http:// or https://',
    });
  }
  const host = url.hostname.toLowerCase();
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  // An explicit allowlist is authoritative (bare hosts or dotted suffixes for
  // subdomains); it is how an internal media host is legitimately reached.
  // The built-in literal denial applies only when no allowlist is configured.
  if (EGRESS_ALLOWLIST.length > 0) {
    const allowed = EGRESS_ALLOWLIST.some(
      (entry) => bare === entry || bare.endsWith(`.${entry}`),
    );
    if (!allowed) {
      throw new BadRequestException({
        code: 'SOURCE_HOST_NOT_ALLOWED',
        message: 'source host is not in EGRESS_ALLOWLIST',
      });
    }
    return;
  }
  const ipv4 = ipv4Octets(bare);
  const denied =
    REFUSED_HOSTNAMES.has(bare) ||
    bare.endsWith('.localhost') ||
    bare.endsWith('.internal') ||
    (ipv4 !== undefined && isPrivateIpv4(ipv4)) ||
    (bare.includes(':') && isPrivateIpv6(bare));
  if (denied) {
    throw new BadRequestException({
      code: 'SOURCE_HOST_NOT_ALLOWED',
      message: 'source host is not fetchable; set EGRESS_ALLOWLIST to permit an internal host',
    });
  }
};

/**
 * Opens the media source for the current request: sets the source direction
 * (`upload` for POSTs, `download` otherwise) and the source stream on the
 * CLS store.
 *
 * Idempotent: when a source stream is already present on the CLS store the
 * call is a no-op, so interceptors bound before or after each other can both
 * rely on it without opening the source twice. Method-less requests (e.g.
 * synthetic invocations) carry no media and are left untouched.
 *
 * Egress (GET): the URL scheme is limited to http/https and loopback, private,
 * link-local and CGNAT literals are refused; `EGRESS_ALLOWLIST` can further
 * restrict the fetchable hosts (comma-separated bare hosts, dotted suffixes
 * allowed). Only `accept`, `accept-language` and `user-agent` are forwarded —
 * client credentials (authorization, cookie, x-*, ...) are never sent to the
 * remote origin.
 *
 * Size cap: both paths are bounded by `CLAMAV_MAX_BYTES` independently of
 * whether virus scanning is enabled — a declared `content-length` over the cap
 * is rejected 413 before any byte flows, and a byte-counting transform
 * self-destructs past the cap for unsized uploads and chunked downloads.
 * @param cls - The normalized CLS service carrying the current request context.
 * @returns Resolves once the source has been opened (or skipped).
 */
export async function openMediaSource(cls: NormalizedClsService): Promise<void> {
  if (cls.sourceStream().get()) return;

  const request = cls.request();
  if (!request?.method) return; // method-less requests carry no media

  const maxBytes = environment.CLAMAV_MAX_BYTES;

  if (request.method.toUpperCase() === 'POST') {
    const declared = Number(request.headers?.['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PayloadTooLargeException(`Input exceeds ${maxBytes} bytes`);
    }
    cls.sourceDirection().set('upload');
    // Cap the raw socket even when virus scanning is disabled: workers
    // downstream would otherwise stream an unbounded upload. When `raw` is
    // absent (synthetic/method-less invocations) the downstream readBody
    // raises the module's own "missing source" client error as before.
    cls.sourceStream().set(request.raw ? request.raw.pipe(new ByteCapTransform(maxBytes)) : request.raw);
    return;
  }

  // The route's validation pipe already rejected junk keys with 400; the .strip()
  // here only re-checks `source` when the pipeline runs outside a controller.
  const { source } = SourceSchema.strip().parse(request.query);
  const url = new URL(source);
  assertEgressAllowed(url);
  const headers: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (value === undefined) continue;
    if (FORWARDABLE_HEADERS.has(name.toLowerCase())) headers[name.toLowerCase()] = value;
  }
  const { body, headers: responseHeaders } = await netRequest(source, {
    headers,
    method: 'GET',
    signal: request.signal,
  });
  const declared = Number(responseHeaders['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) {
    body.destroy();
    throw new PayloadTooLargeException(`Input exceeds ${maxBytes} bytes`);
  }
  cls.sourceDirection().set('download');
  // Meter the remote body so downloaded bytes are observable even on chunked
  // responses without a content-length header. The upload path is counted from
  // its declared content-length instead, so nothing else moves.
  const meter = streamSizeTransform({
    onSize: ({ size }) => cls.bytesIn().set(size),
  });
  // A meter failure degrades into a source failure consumers already handle.
  meter.once('error', () => body.destroy());
  body.pipe(meter);
  // Cap the download too: a hostile or compromised origin could otherwise
  // stream unbounded bytes into the workers.
  const capped = meter.pipe(new ByteCapTransform(maxBytes));
  capped.once('error', () => body.destroy());
  cls.sourceStream().set(capped);
}
