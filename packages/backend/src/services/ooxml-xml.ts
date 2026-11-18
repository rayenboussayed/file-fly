import { XMLParser } from 'fast-xml-parser';

/**
 * Shared fast-xml-parser configuration for OOXML parts: entities are never
 * expanded, namespace prefixes are stripped (producers vary), attributes are
 * kept, tag values are not coerced.
 */
export const xml = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: false,
  removeNSPrefix: true,
  trimValues: true,
});

/**
 * Namespace-preserving variant of {@link xml}, for parts where `id` and `r:id`
 * must not collide (presentation.xml's sldId list). Attribute keys keep their
 * full names (`@_r:id`, `@_id`).
 */
export const xmlRaw = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: false,
  removeNSPrefix: false,
  trimValues: true,
});

/**
 * Reads an attribute (namespace prefixes are stripped before parse).
 * @param value - The parsed element (or attribute holder).
 * @param name - The attribute name without its `@_` prefix.
 * @returns The attribute string, or ''.
 */
export const attr = (value: unknown, name: string): string => {
  if (value && typeof value === 'object') {
    const inner = (value as Record<string, unknown>)[`@_${name}`];
    if (typeof inner === 'string') return inner;
  }
  return '';
};

/**
 * Depth-first walk of a parsed XML tree; visits every key/value pair.
 * @param node - The parsed XML node (or subtree).
 * @param visit - Callback per key/value pair; may throw to abort the walk.
 */
export const walkXml = (node: unknown, visit: (key: string, value: unknown) => void): void => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkXml(item, visit);
    return;
  }
  if (typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    visit(key, value);
    walkXml(value, visit);
  }
};

/**
 * Every element under a given key, anywhere in the tree.
 * @param node - The parsed XML node (or subtree).
 * @param key - The local (namespace-stripped) element name, e.g. `p`, `tbl`, `tr`.
 * @returns The matched elements, in document order.
 */
export const collectByKey = (node: unknown, key: string): unknown[] => {
  const found: unknown[] = [];
  walkXml(node, (entryKey, value) => {
    if (entryKey !== key) return;
    for (const item of Array.isArray(value) ? value : [value]) found.push(item);
  });
  return found;
};

/**
 * Every element under a given local name, ignoring namespace prefixes (any alias).
 * @param node - The parsed XML node (or subtree), with prefixes preserved.
 * @param localName - The element's local name without its prefix.
 * @returns The matched elements, in document order.
 */
export const collectByLocalName = (node: unknown, localName: string): unknown[] => {
  const found: unknown[] = [];
  walkXml(node, (entryKey, value) => {
    if (entryKey.split(':').pop() !== localName) return;
    for (const item of Array.isArray(value) ? value : [value]) found.push(item);
  });
  return found;
};

/**
export const collectByKey = (node: unknown, key: string): unknown[] => {
  const found: unknown[] = [];
  walkXml(node, (entryKey, value) => {
    if (entryKey !== key) return;
    for (const item of Array.isArray(value) ? value : [value]) found.push(item);
  });
  return found;
};
 
/**
 * A <w:t>/<a:t> node may be a plain string or { '#text': string } when attributes are kept.
 * @param value - The text node value.
 * @returns The string, or ''.
 */
const textValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const inner = (value as Record<string, unknown>)['#text'];
    if (inner !== undefined) return String(inner);
  }
  return '';
};

/**
 * Concatenated text of every <w:t>/<a:t> under a node (attributes ignored).
 * @param node - The parsed XML node (or subtree).
 * @returns The concatenated string.
 */
export const textOf = (node: unknown): string => {
  const parts: string[] = [];
  walkXml(node, (key, value) => {
    if (key !== 't') return;
    const text = textValue(value);
    if (text !== '') parts.push(text);
  });
  return parts.join('');
};

/** An entry of the relationships map: resolved absolute-or-relative target, plus mode. */
export interface RelationshipInfo {
  /** True when the relationship points outside the package (`TargetMode="External"`). */
  external: boolean;
  /** The `Target` as authored (relative to the source part). */
  target: string;
}

/**
 * Maps r:id to its target for a .rels part.
 * @param relsXml - The raw rels XML, or undefined.
 * @returns The id-to-target map.
 */
export const collectRelationships = (relsXml: string | undefined): Map<string, RelationshipInfo> => {
  const map = new Map<string, RelationshipInfo>();
  if (relsXml === undefined) return map;
  // fast-xml-parser does not throw on malformed XML; garbage yields no entries.
  const parsed = xml.parse(relsXml) as Record<string, unknown>;
  for (const rel of collectByKey(parsed, 'Relationship')) {
    const record = rel as Record<string, unknown>;
    const id = attr(record, 'Id');
    const target = attr(record, 'Target');
    if (id !== '' && target !== '') {
      map.set(id, { external: attr(record, 'TargetMode').toLowerCase() === 'external', target });
    }
  }
  return map;
};
