import { Agent, interceptors, request, type Dispatcher } from 'undici';

export interface FetchProgress {
  bytesReceived: number;
  totalBytes: number | null; // from content-length; null when absent/chunked
  elapsedMs: number;
}
export type ProgressCallback = (progress: FetchProgress) => void;

export interface RobustRequestOptions {
  method?: 'GET' | 'HEAD';
  headers?: Record<string, string>;
  /** Time to receive response headers before giving up. */
  headersTimeoutMs?: number;
  /** Max IDLE gap between body chunks (resets on each received chunk) before giving up. */
  bodyTimeoutMs?: number;
  onProgress?: ProgressCallback;
  /** Injectable for tests (undici's MockAgent); defaults to the shared, retrying dispatcher. */
  dispatcher?: Dispatcher;
}

export interface RobustBufferResult {
  buffer: Buffer;
  status: number;
  headers: Record<string, string | string[] | undefined>;
  elapsedMs: number;
}

const DEFAULT_HEADERS_TIMEOUT_MS = 10_000;
const DEFAULT_BODY_TIMEOUT_MS = 30_000;

let sharedDispatcher: Dispatcher | null = null;

/** Test-only hook: force (or clear) the shared dispatcher used when no per-call `dispatcher`
 * override is given, so adapter tests can inject an undici MockAgent without threading a
 * dispatcher parameter through the whole SourceAdapter interface. */
export function setSharedDispatcherForTesting(dispatcher: Dispatcher | null): void {
  sharedDispatcher = dispatcher;
}

function getSharedDispatcher(): Dispatcher {
  if (!sharedDispatcher) {
    sharedDispatcher = new Agent({ connections: 4 }).compose(
      interceptors.retry({
        maxRetries: 3,
        minTimeout: 500,
        maxTimeout: 10_000,
        timeoutFactor: 2,
        methods: ['GET', 'HEAD'],
        statusCodes: [429, 500, 502, 503, 504],
        errorCodes: [
          'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE',
          'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT',
        ],
      }),
    );
  }
  return sharedDispatcher;
}

export async function fetchBuffer(url: string, options: RobustRequestOptions = {}): Promise<RobustBufferResult> {
  const start = Date.now();
  const { statusCode, headers, body } = await request(url, {
    method: options.method ?? 'GET',
    headers: options.headers,
    headersTimeout: options.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS,
    bodyTimeout: options.bodyTimeoutMs ?? DEFAULT_BODY_TIMEOUT_MS,
    dispatcher: options.dispatcher ?? getSharedDispatcher(),
  });

  if (statusCode >= 400) {
    await body.dump();
    throw new Error(`HTTP ${statusCode} for ${url}`);
  }

  const contentLength = headers['content-length'];
  const totalBytes = typeof contentLength === 'string' ? Number(contentLength) : null;
  const chunks: Buffer[] = [];
  let bytesReceived = 0;
  for await (const chunk of body) {
    const buf = chunk as Buffer;
    chunks.push(buf);
    bytesReceived += buf.length;
    options.onProgress?.({ bytesReceived, totalBytes, elapsedMs: Date.now() - start });
  }

  return { buffer: Buffer.concat(chunks), status: statusCode, headers, elapsedMs: Date.now() - start };
}

export async function fetchJson<T>(url: string, options?: RobustRequestOptions): Promise<{ data: T; result: RobustBufferResult }> {
  const result = await fetchBuffer(url, options);
  return { data: JSON.parse(result.buffer.toString('utf8')) as T, result };
}

export async function fetchHead(url: string, options?: RobustRequestOptions): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; elapsedMs: number }> {
  const start = Date.now();
  const { statusCode, headers, body } = await request(url, {
    method: 'HEAD',
    headersTimeout: options?.headersTimeoutMs ?? DEFAULT_HEADERS_TIMEOUT_MS,
    dispatcher: options?.dispatcher ?? getSharedDispatcher(),
  });
  await body.dump();
  return { status: statusCode, headers, elapsedMs: Date.now() - start };
}
