import { createServer, type Server, type Socket } from 'node:net';

/**
Maximum INSTREAM payload buffered per connection; fixtures are tiny, this is only a guard.
 */
const MAX_INSTREAM_BYTES = 64 * 1024 * 1024;
/**
A clamd command line shorter than this; anything longer is treated as garbage.
 */
const COMMAND_BUFFER_LIMIT = 16 * 1024;
/**
ASCII marker the EICAR test file embeds; clamd answers FOUND when it is seen in the payload.
 */
const EICAR_MARKER = Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE', 'ascii');

/**
Open sockets per server, destroyed on {@link stopFakeClamd} so teardown never hangs.
 */
const serverSockets = new WeakMap<Server, Set<Socket>>();

/**
 * Starts a minimal clamd-compatible TCP server bound to 127.0.0.1:`port`.
 * Supports `PING` (case-insensitive), `nVERSION`/`zVERSION` and `INSTREAM`;
 * any other command gets `UNKNOWN COMMAND\0` with the connection left open.
 * PING is answered with a bare `PONG` (not `PONG\0`) because node-clam's ping
 * rejects any reply whose trimmed content is not exactly `PONG`.
 * @param port - TCP port to bind; the e2e suite uses 33331.
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
 * connections and closes the listener. Safe to call during e2e teardown.
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
 * Wires up command parsing for one connection. Commands complete at a NUL or
 * LF terminator (PING arrives bare, so it is matched on the buffer head);
 * INSTREAM switches the connection into chunk-accumulation mode.
 * @param socket - The connection to serve.
 */
function handleConnection(socket: Socket) {
  let buffer: Buffer = Buffer.alloc(0);
  let mode: 'command' | 'instream' = 'command';
  let payload: Buffer = Buffer.alloc(0);

  /**
   * Parses as many complete INSTREAM frames (4-byte big-endian length + payload,
   * terminated by a zero-length frame) as the buffer currently holds. The final
   * zero-length frame produces the scan verdict and closes the connection.
   */
  const drainInstream = (): void => {
    for (;;) {
      if (buffer.length < 4) return;
      const length = buffer.readUInt32BE(0);
      if (length === 0) {
        const infected = payload.includes(EICAR_MARKER);
        socket.end(
          infected ? 'stream: Eicar-Test-Signature FOUND\0' : 'stream: OK\0',
        );
        return;
      }
      if (buffer.length < 4 + length) return;
      payload = Buffer.concat([payload, buffer.subarray(4, 4 + length)]);
      if (payload.length > MAX_INSTREAM_BYTES) {
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

    // PING arrives bare (no terminator); any case variant starting with PING gets PONG.
    // NOTE: spec said `PONG\0`, but node-clam's ping accepts only replies where
    // `data.toString().trim() === 'PONG'` and U+0000 is not trimmed, so `PONG\0`
    // fails the client's ping and every scan ends up a 503. Bare `PONG` it is.
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
      payload = Buffer.alloc(0);
      buffer = rest;
      drainInstream();
      return;
    }

    // Unknown command: keep the connection open per clamd conventions.
    socket.write('UNKNOWN COMMAND\0');
    buffer = Buffer.alloc(0);
  });
}
