import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Collects consecutive positional values for a multi-value argument.
 * @param {string[]} argv Argument list.
 * @param {number} startIndex Index of the first value.
 * @returns {{collected: string[], nextIndex: number}} Collected values and the last consumed index.
 */
function collectValues(argv, startIndex) {
  const collected = [argv.at(startIndex)];
  let i = startIndex;
  while (
    argv.at(i + 1) &&
    !argv.at(i + 1).startsWith('--') &&
    !argv.at(i + 1).startsWith('-')
  ) {
    collected.push(argv.at(i + 1));
    i += 1;
  }
  return { collected, nextIndex: i };
}

/**
 * Resolves node-av's formats.d.ts from wherever the package manager hoisted it.
 * @returns {string} Absolute path to formats.d.ts.
 */
const defaultFormatsPath = () => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('node-av');
  return path.resolve(path.dirname(entry), 'constants/formats.d.ts');
};

const usage = `Usage:
  node scripts/union-to-enum.js --file <file.d.ts> --types <UnionA> <UnionB> [--output <file.ts>]

Generates Zod enums and inferred TypeScript types from literal-union exports.

Example:
  node scripts/union-to-enum.js ${String.fromCodePoint(92)}
    --file node_modules/node-av/dist/constants/formats.d.ts ${String.fromCodePoint(92)}
    --types DemuxerFormat MuxerFormat ${String.fromCodePoint(92)}
    --output src/constants/av-formats.ts
`;

/**
 * Extracts string literal values from a named union type export.
 * @param {string} text Source file contents.
 * @param {string} name Union type name to extract.
 * @returns {string[]} The literal values.
 */
function extractUnion(text, name) {
  const headerRegex = /export\s+type\s+([A-Za-z_$][\w$]*)\s*=\s*/g;
  let match;
  while ((match = headerRegex.exec(text)) !== null) {
    if (match[1] === name) break;
  }
  if (!match || match[1] !== name) {
    throw new Error(`Could not find export type ${name} in file`);
  }

  const start = match.index + match[0].length;
  const end = findUnionEnd(text, start);
  const body = text.slice(start, end);

  const stripped = body
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/\/\/[^\n]*/g, '');

  const literals = [...stripped.matchAll(/['"]((?:\\.|[^'"\\])*)['"]/g)];
  if (literals.length === 0) {
    throw new Error(`Union ${name} contains no string literals`);
  }

  const remainder = stripped.replaceAll(/['"](?:\\.|[^'"\\])*['"]/g, '').trim();
  if (!/^(?:\||\s)*$/.test(remainder)) {
    throw new Error(`Union ${name} contains unsupported tokens: ${remainder}`);
  }

  const values = literals.map(([, value]) => {
    const unescaped = value
      .replaceAll(String.raw`\'`, "'")
      .replaceAll(String.raw`\"`, '"')
      .replaceAll(String.raw`\n`, '\n')
      .replaceAll(String.raw`\r`, '\r')
      .replaceAll(String.raw`\t`, '\t')
      .replaceAll(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),);
    return unescaped;
  });

  const unique = new Set(values);
  if (unique.size !== values.length) {
    const duplicate = values.find(
      (value, index) => values.indexOf(value) !== index,
    );
    throw new Error(`Union ${name} contains duplicate value: ${duplicate}`);
  }

  return values;
}

/**
 * Finds the index of the terminating semicolon of a union declaration.
 * @param {string} text Source file contents.
 * @param {number} start Index where the union body begins.
 * @returns {number} Index of the terminating semicolon.
 */
function findUnionEnd(text, start) {
  let quote;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    if (escaped) {
      escaped = false;
      continue;
    }
    const char = text.charAt(i);
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === ';') return i;
  }

  throw new Error('Union declaration did not terminate with a semicolon');
}

/**
 * Formats values as a readonly array export.
 * @param {string} name Exported variable name.
 * @param {string[]} values Literal values.
 * @returns {string} Generated source.
 */
function formatArray(name, values) {
  const lines = [];
  for (let i = 0; i < values.length; i += 16) {
    lines.push(
      `  ${values
        .slice(i, i + 16)
        .map((value) => JSON.stringify(value))
        .join(', ')},`,
    );
  }
  return `export const ${name} = [\n${lines.join('\n')}\n] as const;`;
}

/**
 * Generates source from extracted unions.
 * @param {Record<string, string[]>} types Map of type name to values.
 * @param {string[]} unionNames Names to emit as inline unions.
 * @returns {string} Generated source.
 */
function generate(types, unionNames) {
  const unions = new Set(unionNames);
  const blocks = Object.entries(types).map(([type, values]) => ({
    type,
    values,
    variable: variableName(type),
  }));

  const chunks = ['/* AUTO-GENERATED — DO NOT EDIT MANUALLY. */', ''];

  for (const { type, values, variable } of blocks) {
    const kind = type === 'DemuxerFormat' ? 'demuxer' : 'muxer';
    if (unions.has(type)) {
      const unionBody = values
        .map((value) => `  | ${JSON.stringify(value)}`)
        .join('\n');
      chunks.push(
        `/** The ${type} union: the ffmpeg ${kind} format names (${values.length} values, copied from node-av). */`,
        `export type ${type} =\n${unionBody};`,
        '',
      );
      continue;
    }
    chunks.push(
      `/** FFmpeg ${kind} format names, copied from node-av at generation time. */`,
      formatArray(variable, values),
      '',
    );
  }

  let joined = chunks.join('\n');
  while (joined.endsWith('\n')) joined = joined.slice(0, -1);
  return `${joined}\n`;
}

/**
 * Parses CLI arguments.
 * @param {string[]} argv Argument list.
 * @returns {{file?: string, types?: string[], unions?: string[], output?: string} | void} Parsed args, or void for help.
 */
function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage);
    process.exitCode = 0;
    return;
  }

  const args = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv.at(i);

    const match = arg.match(/^(--|-)(file|types|unions|output|[otf])$/);
    if (!match) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = match[2]
      .replace(/^f$/, 'file')
      .replace(/^t$/, 'types')
      .replace(/^o$/, 'output');
    const value = argv.at(i + 1);
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (key === 'types' || key === 'unions') {
      const { collected, nextIndex } = collectValues(argv, i + 1);
      Reflect.set(args, key, collected);
      i = nextIndex + 1;
      continue;
    }

    if (key === 'file' || key === 'output') Reflect.set(args, key, value);
    i += 2;
  }

  args.file ??= defaultFormatsPath();
  if (!args.types?.length)
    throw new Error('Missing required --types argument(s)');
  args.unions ??= [];
  return args;
}

/**
 * Derives the array variable name from a type name.
 * @param {string} typeName Type name.
 * @returns {string} Variable name.
 */
function variableName(typeName) {
  return `${typeName[0].toLowerCase()}${typeName.slice(1)}s`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args) {
    const source = readFileSync(path.resolve(args.file), 'utf8');
    const types = Object.fromEntries(
      args.types.map((type) => [type, extractUnion(source, type)]),
    );
    const output = generate(types, args.unions);
    const destination = path.resolve(
      args.output ?? 'src/constants/av-formats.ts',
    );

    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, output);
    console.log(`Generated ${destination} from ${args.types.join(', ')}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
