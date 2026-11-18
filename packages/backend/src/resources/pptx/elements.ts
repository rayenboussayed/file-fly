import type { ElementType, PptxBuildType, RunType } from './schema.js';

import { type Presentation, type Slide, type TextProp } from './pptxgenjs.js';

const runToProps = (run: RunType): TextProp => ({
  options: {
    bold: run.bold,
    breakLine: run.breakLine,
    bullet: run.bullet,
    color: run.color,
    fontFace: run.fontFace,
    fontSize: run.fontSize,
    highlight: run.highlight,
    hyperlink: run.hyperlink,
    indentLevel: run.indentLevel,
    italic: run.italic,
    lang: run.lang,
    strike: run.strike,
    subscript: run.subScript,
    superscript: run.superScript,
    underline: run.underline,
  },
  text: run.text,
});

const shapeOf = (pres: Presentation, shape: string): string => {
  const resolved = Object.entries(pres.ShapeType).find(([key]) => key === shape)?.[1];
  if (resolved === undefined) {
    // Unreachable: zod enum mirrors pptxgenjs 4.0.1 keys exactly.
    throw new Error(`unsupported shape: ${shape}`);
  }
  return resolved;
};

const chartOf = (pres: Presentation, chartType: string): string => {
  const resolved = Object.entries(pres.ChartType).find(([key]) => key === chartType)?.[1];
  if (resolved === undefined) {
    // Unreachable: zod enum mirrors pptxgenjs 4.0.1 keys exactly.
    throw new Error(`unsupported chart type: ${chartType}`);
  }
  return resolved;
};

/**
 * Throws for an unrepresentable element; only reachable via a widened union.
 * @param element - The element the exhaustiveness check failed on.
 * @throws {Error} Always.
 */
const exhaustiveError = (element: never): never => {
  throw new Error(`unhandled element type: ${String(element)}`);
};

/**
 * Applies one element to the slide.
 * @param pres - The presentation (enum tables live on the instance).
 * @param slide - The target slide.
 * @param element - The validated element descriptor.
 * @returns Nothing.
 */
const buildElement = (pres: Presentation, slide: Slide, element: ElementType): void => {
  switch (element.type) {
    case 'chart': {
      const chartType = chartOf(pres, element.chartType);
      slide.addChart(chartType, element.series, {
        chartColors: element.chartColors,
        h: element.h,
        showLegend: element.showLegend,
        showTitle: element.title !== undefined,
        showValue: element.showValue,
        title: element.title,
        w: element.w,
        x: element.x,
        y: element.y,
      });
      return;
    }
    case 'image': {
      const { altText, sizing, transparency } = element;
      slide.addImage({
        altText,
        data: `data:image/${element.imageType};base64,${element.data}`,
        h: element.h,
        sizing:
          sizing === undefined
            ? undefined
            : { h: sizing.h, type: sizing.type, w: sizing.w },
        transparency,
        w: element.w,
        x: element.x,
        y: element.y,
      });
      return;
    }
    case 'shape': {
      const shape = shapeOf(pres, element.shape);
      // pptxgenjs renders caption text only via addText(..., { shape }); addShape ignores it.
      if (element.text) {
        slide.addText(element.text.map(runToProps), {
          fill: element.fill,
          h: element.h,
          line: element.line,
          rotation: element.rotation,
          shape,
          w: element.w,
          x: element.x,
          y: element.y,
        });
        return;
      }
      slide.addShape(shape, {
        fill: element.fill,
        h: element.h,
        line: element.line,
        rotation: element.rotation,
        w: element.w,
        x: element.x,
        y: element.y,
      });
      return;
    }
    case 'table': {
      slide.addTable(
        element.rows.map((row) =>
          row.map((cell) => ({
            options: {
              colspan: cell.colSpan ?? cell.options?.colspan,
              fill: cell.fill ?? cell.options?.fill,
              margin: cell.options?.margin,
              rowspan: cell.rowSpan ?? cell.options?.rowspan,
              valign: cell.options?.valign,
            },
            text: cell.text,
          })),
        ),
        {
          h: element.h,
          margin: element.margin,
          w: element.w,
          x: element.x,
          y: element.y,
        },
      );
      return;
    }
    case 'text': {
      slide.addText(
        element.runs.map(runToProps),
        {
          align: element.align,
          bullet: element.bullet,
          fill: element.fill,
          fit: element.fit,
          h: element.h,
          indentLevel: element.indentLevel,
          line: element.line,
          lineSpacing: element.lineSpacing,
          margin: element.margin,
          rotation: element.rotation,
          rtl: element.rtl,
          rtlMode: element.rtl,
          valign: element.valign,
          w: element.w,
          x: element.x,
          y: element.y,
        },
      );
      return;
    }
    default:
      // Every union member is handled above; this is unreachable.
      return exhaustiveError(element);
  }
};

/**
 * Builds the presentation and returns the .pptx bytes.
 * @param pres - The presentation being assembled.
 * @param body - Validated build payload.
 * @returns The serialized .pptx bytes.
 */
export const buildPresentation = async (
  pres: Presentation,
  body: PptxBuildType,
): Promise<Buffer> => {
  if (body.theme?.headFontFace !== undefined) {
    pres.theme = { ...(pres.theme ?? {}), headFontFace: body.theme.headFontFace };
  }
  if (body.theme?.bodyFontFace !== undefined) {
    pres.theme = { ...(pres.theme ?? {}), bodyFontFace: body.theme.bodyFontFace };
  }
  if (body.layout !== undefined) {
    pres.layout = body.layout;
  }
  if (body.metadata?.title !== undefined) pres.title = body.metadata.title;
  if (body.metadata?.author !== undefined) pres.author = body.metadata.author;
  if (body.metadata?.subject !== undefined) pres.subject = body.metadata.subject;
  if (body.metadata?.company !== undefined) pres.company = body.metadata.company;
  if (body.metadata?.revision !== undefined) pres.revision = body.metadata.revision;

  for (const slidePayload of body.slides) {
    const slide = pres.addSlide();
    if (slidePayload.background !== undefined) {
      slide.background = { color: slidePayload.background.color };
    }
    if (slidePayload.notes !== undefined) {
      slide.addNotes(slidePayload.notes);
    }
    for (const element of slidePayload.elements) {
      buildElement(pres, slide, element);
    }
  }

  const bytes = await pres.write({ outputType: 'nodebuffer' });
  return Buffer.from(bytes as Uint8Array);
};
