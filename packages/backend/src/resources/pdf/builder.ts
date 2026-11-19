import { BadRequestException } from '@nestjs/common';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import type { ElementType, PdfBuildType } from './schema.js';

import {
  type BuilderContext,
  collectFontNames,
  drawElement,
  pageSizeOf,
  segmentPages,
  standardValueOf,
} from './elements.js';

const collectStandardFontNames = (
  segments: ReturnType<typeof segmentPages>,
): Set<string> => {
  const used = new Set<string>(['Helvetica']);
  for (const segment of segments) {
    for (const element of segment.elements) {
      if (element.type === 'table' && element.header === true) used.add('Helvetica-Bold');
      for (const name of collectFontNames(element)) {
        if (name !== undefined && standardValueOf(name) !== undefined) used.add(name);
      }
    }
  }
  return used;
};



const embedFonts = async (
  pdfDoc: PDFDocument,
  body: PdfBuildType,
  segments: ReturnType<typeof segmentPages>,
): Promise<BuilderContext> => {
  const embeddedFonts = body.embeddedFonts ?? [];
  const fonts = new Map<string, import('pdf-lib').PDFFont>();
  if (embeddedFonts.length > 0) {
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    pdfDoc.registerFontkit(fontkit);
  }
  for (const font of embeddedFonts) {
    try {
      // pooled Buffer -> copied, standalone view (pdf-lib reads imageData.buffer wholesale)
      fonts.set(font.name, await pdfDoc.embedFont(new Uint8Array(Buffer.from(font.data, 'base64')), { subset: true }));
    } catch {
      throw new BadRequestException({
        code: 'PDF_FONT_UNREADABLE',
        message: `embedded font "${font.name}" is not a readable TTF/OTF`,
      });
    }
  }
  const standard = new Map<string, import('pdf-lib').PDFFont>();
  for (const name of collectStandardFontNames(segments)) {
    const standardFont = standardValueOf(name);
    if (standardFont) standard.set(name, await pdfDoc.embedFont(standardFont));
  }
  const defaultFont = standard.get('Helvetica') ?? (await pdfDoc.embedFont(StandardFonts.Helvetica));
  return { defaultFont, fonts, standard };
};

const embedOneImage = async (
  pdfDoc: PDFDocument,
  element: Extract<ElementType, { type: 'image' }>,
): Promise<import('pdf-lib').PDFImage> => {
  // pdf-lib's embedders read `imageData.buffer` wholesale, ignoring byteOffset:
  // hand them a copied, standalone view or pooled Node Buffers decode garbage.
  const bytes = new Uint8Array(Buffer.from(element.data, 'base64'));
  try {
    return element.imageType === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  } catch (error) {
    throw new BadRequestException({
      code: 'PDF_IMAGE_UNREADABLE',
      message: `image could not be embedded: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
};

const embedImages = async (
  pdfDoc: PDFDocument,
  segments: ReturnType<typeof segmentPages>,
): Promise<Map<object, import('pdf-lib').PDFImage>> => {
  const images = new Map<object, import('pdf-lib').PDFImage>();
  for (const segment of segments) {
    for (const element of segment.elements) {
      if (element.type !== 'image') continue;
      images.set(element, await embedOneImage(pdfDoc, element));
    }
  }
  return images;
};

const applyMetadata = (pdfDoc: PDFDocument, body: PdfBuildType): void => {
  const metadata = body.metadata;
  if (!metadata) return;
  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) {
    const keywords = Array.isArray(metadata.keywords)
      ? metadata.keywords
      : metadata.keywords.split(',').map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0);
    pdfDoc.setKeywords(keywords);
  }
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);
  if (metadata.language !== undefined) pdfDoc.setLanguage(metadata.language);
  if (metadata.creationDate !== undefined) pdfDoc.setCreationDate(new Date(metadata.creationDate));
  // updateInfoDict overrides Producer and ModificationDate at create/save time; user calls do not stick.
};

/**
 * Builds the PDF document body as bytes. Pages are created up front so the
 * total logical page count (including `pageBreak` segments) is known before
 * any element is drawn. Fonts and images are embedded before drawing, so the
 * draw pass is fully synchronous.
 *
 * Coordinate convention: every `y` is a distance from the page's top edge,
 * in points (1 pt = 1/72 inch). For `text` and `pageNumber`, `y` is the distance
 * to the top of the first text line's em box; the baseline is at
 * `pageHeight - y - size` and every line advances by `size * 1.2`. Lines, rects,
 * ellipses, images, fields and tables take `y` as the distance to the element's
 * top edge; `line` endpoints are absolute distances from the top.
 * @param body - Validated build payload.
 * @returns The .pdf bytes.
 */
export const buildPdfDocument = async (body: PdfBuildType): Promise<Uint8Array> => {
  const segments = segmentPages(body.pages);
  const pdfDoc = await PDFDocument.create();
  const pages = segments.map((segment) => pdfDoc.addPage(pageSizeOf(segment.page)));
  const numPages = pages.length;

  const ctx = await embedFonts(pdfDoc, body, segments);
  const images = await embedImages(pdfDoc, segments);

  segments.forEach((segment, index) => {
    // `segment.page` is read from the array the builder created, no prototype lookup.
    // eslint-disable-next-line security/detect-object-injection
    const page = pages[index];
    if (page === undefined) throw new Error('segment/page pairing lost');
    for (const element of segment.elements) {
      drawElement(pdfDoc, page, element, ctx, images, numPages, index + 1);
    }
  });

  applyMetadata(pdfDoc, body);

  // pdf-lib refreshes widget appearances at save() time; the explicit call is unnecessary.
  return pdfDoc.save();
};
