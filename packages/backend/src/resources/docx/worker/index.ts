import { Document, Footer, Header, Packer, Paragraph } from 'docx';
import { workerData } from 'node:worker_threads';

import type { DocxBuildType } from '../schema.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { OoxmlReader } from '../../../services/ooxml-reader.js';
import { buildBlock, buildSectionOptions } from '../elements.js';

const logger = createWorkerLogger();

/** Worker input: `{ operation: 'build', payload: DocxBuildType }` from WorkerService. */
type WorkerInput = { operation?: string; payload: DocxBuildType };

/**
 * Ends the worker with a clean exit, dropping the stdin handle so the event loop
 * drains, with a short backstop for native handles.
 * @param code - Exit code.
 */
const runStandalone = process.env.FILE_FLY_WORKER === '1';

const finishWorker = (code: number) => {
  if (!runStandalone) return; // unit specs import the module in-process
  process.exitCode = code;
  process.stdin.destroy();
// eslint-disable-next-line n/no-process-exit -- worker threads need the explicit exit backstop; native media handles can linger past the stdin drain.
  setTimeout(() => process.exit(code), 250).unref();
};

const buildNoteMap = (notes: NonNullable<DocxBuildType['footnotes']> | undefined) =>
  notes === undefined
    ? undefined
    : Object.fromEntries(
        notes.map((note) => [String(note.id), { children: note.children.flatMap(buildBlock) as Paragraph[] }]),
      );

const buildHeaderFooter = (
  spec: DocxBuildType['sections'][number]['headers'],
  kind: 'footer' | 'header',
) => {
  if (spec === undefined) return undefined;
  const build = (value: NonNullable<typeof spec>['default']) =>
    Array.isArray(value)
      ? value.flatMap((element) => buildBlock(element) as Paragraph[])
      : [new Paragraph({ children: [] })];
  const ctor = kind === 'header' ? Header : Footer;
  return {
    default: spec.default === undefined ? undefined : new ctor({ children: build(spec.default) }),
    even: spec.even === undefined ? undefined : new ctor({ children: build(spec.even) }),
    first: spec.first === undefined ? undefined : new ctor({ children: build(spec.first) }),
  };
};

const data = workerData as WorkerInput;

if (data.operation !== 'build') {
  logger.error({ operation: data.operation }, 'unsupported worker operation');
  finishWorker(1);
} else {
  const { payload } = data;

  const document = new Document({
    ...(payload.metadata ?? {}),
    comments: payload.comments?.length
      ? {
          children: payload.comments.map((comment) => ({
            author: comment.author,
            children: comment.children.flatMap(buildBlock) as Paragraph[],
            date: comment.date,
            id: comment.id,
            initials: comment.initials,
          })),
        }
      : undefined,
    endnotes: buildNoteMap(payload.endnotes),
    evenAndOddHeaderAndFooters: payload.sections.some(
      (section) => section.headers?.even !== undefined || section.footers?.even !== undefined,
    ),
    footnotes: buildNoteMap(payload.footnotes),
    numbering:
      payload.numbering === undefined
        ? undefined
        : {
            config: payload.numbering.map((definition) => ({
              levels: definition.levels.map((level) => ({
                alignment:
                  level.alignment === undefined
                    ? undefined
                    : ({ center: 'center', left: 'left', right: 'right' } as const)[level.alignment],
                format:
                  ({
                    bullet: 'bullet',
                    decimal: 'decimal',
                    lowerLetter: 'lowerLetter',
                    lowerRoman: 'lowerRoman',
                    none: 'none',
                    upperLetter: 'upperLetter',
                    upperRoman: 'upperRoman',
                  } as const)[level.format],
                level: level.level,
                start: level.start,
                text: level.text,
              })),
              reference: definition.reference,
            })),
          },
    sections: payload.sections.map((section) => ({
      children: section.children.flatMap((element) => buildBlock(element)),
      footers: buildHeaderFooter(section.footers, 'footer'),
      headers: buildHeaderFooter(section.headers, 'header'),
      properties: {
        ...buildSectionOptions(section),
        // First-page header/footer only takes effect with <w:titlePg/>.
        titlePage:
          section.headers?.first !== undefined || section.footers?.first !== undefined,
      },
    })),
  });

  Packer.toBuffer(document)
    .then((buffer) => {
      // Refuse to emit a corrupt document: a valid container is the only acceptable output.
      const parts = OoxmlReader.readParts(buffer);
      if (!parts.has('word/document.xml')) {
        throw new Error('missing word/document.xml in output');
      }
      // Exit only once the bytes are flushed; an early exit(0) would truncate the output.
      process.stdout.write(buffer, () => finishWorker(0));
      return buffer;
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'docx build failed');
      finishWorker(1);
    });
}
