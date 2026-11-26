import { createServer, type Server, type Socket } from 'node:net';

/**
Maximum INSTREAM payload buffered per connection; upload fixtures are tiny, this is only a guard.
 */
const MAX_INSTREAM_BYTES = 64 * 1024 * 1024;
/**
Command lines longer than this are treated as garbage.
 */
const COMMAND_BUFFER_LIMIT = 16 * 1024;

/**
Open sockets per server, destroyed on stopFakeClamd so teardown never hangs.
 */
const serverSockets = new WeakMap<Server, Set<Socket>>();

/**
 * Starts a minimal clamd-compatible TCP server bound to 127.0.0.1:`port`.
 * Supports `PING` (bare `PONG`, required by node-clam), `nVERSION`/`zVERSION`
 * and `INSTREAM` (always answers `stream: OK` — the e2e seed only feeds clean
 * fixtures). Adapted from `packages/backend/test/fake-clamd.ts`; keep the
 * wire behavior in sync with it if either side changes.
 * @param port - TCP port to bind; the dashboard e2e uses 33332.
 * @returns The listening server. Use {@link stopFakeClamd} to tear it down.
 */
export function startFakeClamd(port: number): Promise<Server> {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
    socket.on('error', () => {
      // Clients may reset mid-scan; nothing to report to in a test fake.
    });
    handleConnection(socket);
  });
  serverSockets.set(server, sockets);

  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      reject(error);
    };
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', onError);
      resolve(server);
    });
  });
}

/**
 * Stops a server created by {@link startFakeClamd}: destroys lingering
 * connections and closes the listener. Safe to call during teardown.
 * @param server - The server returned by {@link startFakeClamd}.
 */
export async function stopFakeClamd(server: Server): Promise<void> {
  const sockets = serverSockets.get(server);
  if (sockets) {
    for (const socket of sockets) socket.destroy();
    sockets.clear();
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Wires up command parsing for one connection. INSTREAM switches the
 * connection into chunk-accumulation mode and answers with a clean verdict
 * once the zero-length terminator frame arrives.
 * @param socket - The connection to serve.
 */
function handleConnection(socket: Socket) {
  let buffer: Buffer = Buffer.alloc(0);
  let mode: 'command' | 'instream' = 'command';
  let payloadBytes = 0;

  /**
   * Parses as many complete INSTREAM frames (4-byte big-endian length +
   * payload, terminated by a zero-length frame) as the buffer currently holds.
   */
  const drainInstream = (): void => {
    for (;;) {
      if (buffer.length < 4) return;
      const length = buffer.readUInt32BE(0);
      if (length === 0) {
        socket.end('stream: OK\0');
        return;
      }
      if (buffer.length < 4 + length) return;
      payloadBytes += length;
      if (payloadBytes > MAX_INSTREAM_BYTES) {
        // Guard: drop connections that buffer too much instead of growing without bound.
        socket.destroy();
        return;
      }
      buffer = buffer.subarray(4 + length);
    }
  };

  socket.on('data', (chunk: Buffer) => {
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);

    if (mode === 'instream') {
      drainInstream();
      return;
    }

    // PING arrives bare (no terminator); node-clam rejects replies whose trimmed
    // content is not exactly `PONG`, so answer with a bare PONG.
    if (buffer.toString('latin1').toUpperCase().startsWith('PING')) {
      socket.end('PONG');
      buffer = Buffer.alloc(0);
      return;
    }

    const nul = buffer.indexOf(0x00);
    const lf = buffer.indexOf(0x0a);
    let terminator: number;
    if (nul === -1) {
      terminator = lf;
    } else if (lf === -1) {
      terminator = nul;
    } else {
      terminator = Math.min(nul, lf);
    }
    if (terminator === -1) {
      // Command not fully arrived yet; drop runaway garbage instead of buffering forever.
      if (buffer.length > COMMAND_BUFFER_LIMIT) {
        socket.write('UNKNOWN COMMAND\0');
        buffer = Buffer.alloc(0);
      }
      return;
    }

    const head = buffer.subarray(0, terminator).toString('latin1').toUpperCase().trim();
    const rest = buffer.subarray(terminator + 1);
    // Strip the `z`/`n` framing prefix shared by all other commands.
    const normalized = head.replace(/^[NZ]/, '');

    if (normalized === 'VERSION') {
      socket.end('clamd 1.5.0/antivirus-test\0');
      buffer = Buffer.alloc(0);
      return;
    }
    if (normalized === 'INSTREAM') {
      mode = 'instream';
      payloadBytes = 0;
      buffer = rest;
      drainInstream();
      return;
    }

    // Unknown command: keep the connection open per clamd conventions.
    socket.write('UNKNOWN COMMAND\0');
    buffer = Buffer.alloc(0);
  });
}
