import { XMLParser } from 'fast-xml-parser';

import { OoxmlReader } from './ooxml-reader.js';

/**
 * Normalized OOXML core/app properties (Dublin Core `docProps/core.xml` and
 * `docProps/app.xml`). Values keep their original wire types; consumers coerce.
 * All fields are optional because files may omit any of them.
 */
export interface OoxmlMetadata {
  /** From `docProps/app.xml`. */
  application?: string;
  /** From `docProps/app.xml`, e.g. the producing application's version. */
  appVersion?: string;
  /** `docProps/app.xml`, usually a word processor revision count (number as string). */
  category?: string;
  /** From `docProps/app.xml`. */
  company?: string;
  /** Creation timestamp as authored (ISO string in practice). */
  created?: string;
  creator?: string;
  description?: string;
  keywords?: string;
  lastModifiedBy?: string;
  modified?: string;
  pages?: string;
  revision?: string;
  slides?: string;
  subject?: string;
  title?: string;
  totalTime?: string;
  words?: string;
}

// `removeNSPrefix`: core.xml prefixes vary by producer (cp:, dc:, dcterms:).
const xml = new XMLParser({
  parseTagValue: false,
  processEntities: false,
  removeNSPrefix: true,
  trimValues: true,
});

const text = (value: unknown): string | undefined => {
  // Tag values are never coerced by our parser config: leaves are strings or objects.
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    const inner = (value as { '#text': unknown })['#text'];
    return String(inner);
  }
  return undefined;
};

// XML parse of attacker-controlled parts can fail; surface it as a boundary error.
const parsePart = (raw: string | undefined): Record<string, unknown> | undefined => {
  if (raw === undefined) return undefined;
  try {
    const parsed: unknown = xml.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Extracts normalized metadata from an OOXML package.
 * @param parts - The parts returned by {@link OoxmlReader.readParts}.
 * @returns The normalized properties; empty object when no docProps part is present.
 */
export function parseOoxmlMetadata(parts: Map<string, Buffer>): OoxmlMetadata {
  const core = parsePart(OoxmlReader.partText(parts, 'docProps/core.xml'));
  const app = parsePart(OoxmlReader.partText(parts, 'docProps/app.xml'));

  const c = (core?.['coreProperties'] ?? core?.['CoreProperties']) as
    | Record<string, unknown>
    | undefined;
  const a = (app?.['Properties'] ?? app?.['properties']) as
    | Record<string, unknown>
    | undefined;

  return {
    application: text(a?.['Application']),
    appVersion: text(a?.['AppVersion']),
    category: text(c?.['category']),
    company: text(a?.['Company']),
    created: text(c?.['created']),
    creator: text(c?.['creator']),
    description: text(c?.['description']),
    keywords: text(c?.['keywords']),
    lastModifiedBy: text(c?.['lastModifiedBy']),
    modified: text(c?.['modified']),
    pages: text(a?.['Pages']),
    revision: text(c?.['revision']),
    slides: text(a?.['Slides']),
    subject: text(c?.['subject']),
    title: text(c?.['title']),
    totalTime: text(a?.['TotalTime']),
    words: text(a?.['Words']),
  };
}
