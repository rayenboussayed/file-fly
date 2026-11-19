#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/** Resolves node-av's formats.d.ts from wherever the package manager hoisted it. */
const defaultFormatsPath = () => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('node-av');
  return path.resolve(path.dirname(entry), 'constants/formats.d.ts');
};

const usage = `Usage:
  node scripts/union-to-enum.js --file <file.d.ts> --types <UnionA> <UnionB> [--output <file.ts>]

Generates Zod enums and inferred TypeScript types from literal-union exports.

Example:
  node scripts/union-to-enum.js \\
    --file node_modules/node-av/dist/constants/formats.d.ts \\
    --types DemuxerFormat MuxerFormat \\
    --output src/constants/av-formats.ts
`;

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(usage);
      process.exit(0);
    }

    const match = arg.match(/^(--|-)(file|types|unions|output|o|t|f)$/);
    if (!match) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = match[2]
      .replace(/^f$/, 'file')
      .replace(/^t$/, 'types')
      .replace(/^o$/, 'output');
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    i += 1;
    if (key === 'types' || key === 'unions') {
      args[key] = [value];
      while (
        argv[i + 1] &&
        !argv[i + 1].startsWith('--') &&
        !argv[i + 1].startsWith('-')
      ) {
        args[key].push(argv[i + 1]);
        i += 1;
      }
      continue;
    }

    args[key] = value;
  }

  args.file ??= defaultFormatsPath();
  if (!args.types?.length)
    throw new Error('Missing required --types argument(s)');
  args.unions ??= [];
  return args;
}

function findUnionEnd(text, start) {
  let quote;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === '\\') {
        escaped = true;
        continue;
      }
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

function extractUnion(text, name) {
  const header = new RegExp(`export\\s+type\\s+${name}\\s*=\\s*`);
  const match = header.exec(text);
  if (!match) {
    throw new Error(
      `Could not find export type ${name} in ${match?.index ?? 'file'}`,
    );
  }

  const start = match.index + match[0].length;
  const end = findUnionEnd(text, start);
  const body = text.slice(start, end);

  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  const literals = [...stripped.matchAll(/['"]((?:\\.|[^'"\\])*)['"]/g)];
  if (literals.length === 0) {
    throw new Error(`Union ${name} contains no string literals`);
  }

  const remainder = stripped.replace(/['"](?:\\.|[^'"\\])*['"]/g, '').trim();
  if (!/^(?:\||\s)*$/.test(remainder)) {
    throw new Error(`Union ${name} contains unsupported tokens: ${remainder}`);
  }

  const values = literals.map(([, value]) => {
    const unescaped = value
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
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

function variableName(typeName) {
  return `${typeName[0].toLowerCase()}${typeName.slice(1)}s`;
}

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

function generate(types, unionNames) {
  const unions = new Set(unionNames);
  const blocks = Object.entries(types).map(([type, values]) => ({
    type,
    variable: variableName(type),
    values,
  }));

  const chunks = ['/* AUTO-GENERATED — DO NOT EDIT MANUALLY. */'];
  chunks.push('');

  for (const { type, variable, values } of blocks) {
    const kind = type === 'DemuxerFormat' ? 'demuxer' : 'muxer';
    if (unions.has(type)) {
      // Union-only type: emit the literal union inline (nothing else imports the array).
      chunks.push(
        `/** The ${type} union: the ffmpeg ${kind} format names (${values.length} values, copied from node-av). */`,
      );
      chunks.push(
        `export type ${type} =\n${values.map((value) => `  | ${JSON.stringify(value)}`).join('\n')};`,
        '',
      );
      continue;
    }
    chunks.push(
      `/** FFmpeg ${kind} format names, copied from node-av at generation time. */`,
    );
    chunks.push(formatArray(variable, values), '');
  }

  return `${chunks.join('\n').replace(/\n+$/, '')}\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
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
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
