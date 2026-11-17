#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

    const match = arg.match(/^(--|-)(file|types|output|o|t|f)$/);
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
    if (key === 'types') {
      args.types = [value];
      while (argv[i + 1] && !argv[i + 1].startsWith('--') && !argv[i + 1].startsWith('-')) {
        args.types.push(argv[i + 1]);
        i += 1;
      }
      continue;
    }

    args[key] = value;
  }

  if (!args.file) throw new Error('Missing required --file argument');
  if (!args.types?.length) throw new Error('Missing required --types argument(s)');
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
    throw new Error(`Could not find export type ${name} in ${match?.index ?? 'file'}`);
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
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    return unescaped;
  });

  const unique = new Set(values);
  if (unique.size !== values.length) {
    const duplicate = values.find((value, index) => values.indexOf(value) !== index);
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
    lines.push(`  ${values.slice(i, i + 16).map((value) => JSON.stringify(value)).join(', ')},`);
  }
  return `export const ${name} = [\n${lines.join('\n')}] as const;`;
}

function generate(types) {
  const blocks = Object.entries(types).map(([type, values]) => ({
    type,
    variable: variableName(type),
    values,
  }));

  const chunks = [
    '/* AUTO-GENERATED — DO NOT EDIT MANUALLY. */',
    "import { z } from 'zod';",
    '',
  ];

  for (const { variable, values } of blocks) {
    chunks.push(formatArray(variable, values), '');
  }

  for (const { type, variable } of blocks) {
    chunks.push(`export const ${type}Schema = z.enum(${variable});`);
  }

  chunks.push('');

  for (const { type } of blocks) {
    chunks.push(`export type ${type} = z.infer<typeof ${type}Schema>;`);
  }

  return `${chunks.join('\n').replace(/\n+$/, '')}\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const source = readFileSync(path.resolve(args.file), 'utf8');
  const types = Object.fromEntries(
    args.types.map((type) => [type, extractUnion(source, type)]),
  );
  const output = generate(types);
  const destination = path.resolve(args.output ?? 'src/constants/av-formats.ts');

  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, output);
  console.log(`Generated ${destination} from ${args.types.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
