/** URL schemes allowed for hrefs written into generated documents (Word/PowerPoint open these). */
const ALLOWED_URL_SCHEMES = new Set(['http', 'https', 'mailto']);

/**
 * Whether a URL uses one of the allowed schemes (http, https, mailto).
 * Generated documents opened by Word/PowerPoint will follow `javascript:` and `file:` links,
 * so anything else is rejected at the boundary.
 * @param url - The absolute URL to check.
 * @returns True for http, https and mailto links.
 */
export function hyperlinkUrlOk(url: string): boolean {
  try {
    const protocol = new URL(url).protocol.replace(/:$/, '').toLowerCase();
    return ALLOWED_URL_SCHEMES.has(protocol);
  } catch {
    return false;
  }
}
