import fs from 'node:fs';
import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { runAudioWorker } from './worker/index.js';

const hoisted = vi.hoisted(() => ({ workerData: {} as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

interface AudioDnaResult {
  algorithm: string;
  env: { nodeAv: string };
  hash: string;
  length: number;
  version: string;
}

/**
 * Replaces process.stdout with a capturing Writable; returns collected chunks.
 * @returns The array collecting written chunks.
 */
function captureStdout(): Buffer[] {
  const chunks: Buffer[] = [];
  const stdout = new Writable({
    write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      callback();
    },
  });
  stdout.on('error', () => undefined);
  Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
  return chunks;
}

/**
 * Runs the audio DNA worker over the 6 s fixture and parses its stdout JSON line.
 * @returns The parsed DNA result.
 */
async function runDna(): Promise<AudioDnaResult> {
  hoisted.workerData = { inputFormat: 'mp3', operation: 'dna' };
  const input = fs.createReadStream('assets/audios/audio-2.mp3');
  input.on('error', () => undefined);
  Object.defineProperty(process, 'stdin', { value: input, writable: true });
  const chunks = captureStdout();
  await runAudioWorker({ inputFormat: 'mp3', operation: 'dna' } as never);
  return JSON.parse(Buffer.concat(chunks).toString('utf8').trim()) as AudioDnaResult;
}

describe('audio dna worker', () => {
  it('emits a well-formed chromaprint fingerprint', { timeout: 30000 }, async () => {
    const parsed = await runDna();
    expect(parsed.algorithm).toBe('chromaprint');
    expect(parsed.version).toBe('chromaprint@1');
    expect(typeof parsed.hash).toBe('string');
    const raw = Buffer.from(parsed.hash, 'base64');
    expect(raw.length % 4).toBe(0);
    expect(parsed).toHaveLength(raw.length / 4);
    expect(parsed.length).toBeGreaterThan(0);
    expect(typeof parsed.env.nodeAv).toBe('string');
    expect(parsed.env.nodeAv.length).toBeGreaterThan(0);
  });

  it('produces an identical hash across runs', { timeout: 30000 }, async () => {
    const first = await runDna();
    const second = await runDna();
    expect(second.hash).toBe(first.hash);
  });
});
