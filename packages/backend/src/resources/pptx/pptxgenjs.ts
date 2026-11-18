import PptxGenJsRuntime from 'pptxgenjs';

/** A presentation in progress; this is the narrow subset the builder uses. */
export interface Presentation {
  /** Creates a new slide. */
  addSlide(): Slide;
  /** Workbook author metadata. */
  author: string;
  ChartType: Record<string, string>;
  /** Workbook company metadata. */
  company: string;
  /** Declared slide layout, e.g. `LAYOUT_16x9`. */
  layout: string;
  /** Workbook revision metadata. */
  revision: string;
  /** Enum tables exposed on the instance. */
  ShapeType: Record<string, string>;
  /** Workbook subject metadata. */
  subject: string;
  /** Theme font faces. */
  theme: { bodyFontFace?: string; headFontFace?: string };
  /** Workbook title metadata. */
  title: string;
  /** Serializes the presentation; `nodebuffer` returns a Node Buffer. */
  write(options: { outputType: 'nodebuffer' }): Promise<Buffer | Uint8Array>;
}

/** A slide created by the presentation; exposes the element-adding methods we use. */
export interface Slide {
  /** Adds a chart with the given pptxgenjs chart type. */
  addChart(
    type: string,
    data: Array<Record<string, unknown>>,
    options?: Record<string, unknown>,
  ): Slide;
  /** Adds an image from encoded data or a URL. */
  addImage(options: Record<string, unknown>): Slide;
  /** Adds speaker notes to the slide. */
  addNotes(notes: string): Slide;
  /** Adds a shape by name (e.g. `pres.ShapeType.rect`). */
  addShape(shapeName: string, options?: Record<string, unknown>): Slide;
  /** Adds a table. */
  addTable(rows: unknown[][], options?: Record<string, unknown>): Slide;
  /** Adds a text box. */
  addText(text: string | TextProp[], options?: Record<string, unknown>): Slide;
  /** Slide background fill. */
  background: { color?: string };
}

/** A text run as pptxgenjs expects it. */
export interface TextProp {
  /** Run option bag (bold, italic, color, hyperlink, bullet, ...). */
  options?: RunOptions;
  /** The literal text content of the run. */
  text?: string;
}

/** Constructor of the narrow Presentation above (matches the CJS export shape). */
type PresentationConstructor = new () => Presentation;

/** Run-level options subset; passed through to pptxgenjs unchanged. */
interface RunOptions {
  /** Bold styling. */
  bold?: boolean;
  /** Force a line break after the run. */
  breakLine?: boolean;
  /** Bullet configuration; `true` means the default bullet. */
  bullet?: boolean | { code?: string };
  /** Hex color without a leading `#`. */
  color?: string;
  /** Font face name. */
  fontFace?: string;
  /** Font size in points. */
  fontSize?: number;
  /** Highlight (marker) hex color. */
  highlight?: string;
  /** Run hyperlink. */
  hyperlink?: { slide?: number; url?: string };
  /** Bullet indent level (0-8). */
  indentLevel?: number;
  /** Italic styling. */
  italic?: boolean;
  /** ISO 639 language for the run. */
  lang?: string;
  /** Strikethrough. */
  strike?: boolean;
  /** Subscript (pptxgenjs `subscript`). */
  subscript?: boolean;
  /** Superscript (pptxgenjs `superscript`). */
  superscript?: boolean;
  /** Underline (single line). */
  underline?: boolean;
}

/**
 * The pptxgenjs class. Its UMD types do not interop with nodenext ESM, so we
 * keep a narrow structural interface; the runtime default export is the class.
 */
export const PptxGenJs = PptxGenJsRuntime as unknown as PresentationConstructor;
