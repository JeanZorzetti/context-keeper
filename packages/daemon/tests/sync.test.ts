import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncDecisionsToWeb, replayPendingSync, persistPayload } from '../src/sync.js';

let tmpDir: string;
let queueDir: string;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-sync-'));
  queueDir = path.join(tmpDir, 'sync-queue');
  savedEnv.CONTEXT_KEEPER_API_URL = process.env.CONTEXT_KEEPER_API_URL;
  savedEnv.CONTEXT_KEEPER_TOKEN = process.env.CONTEXT_KEEPER_TOKEN;
  process.env.CONTEXT_KEEPER_API_URL = 'https://example.com';
  process.env.CONTEXT_KEEPER_TOKEN = 'tok';
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  for (const key of ['CONTEXT_KEEPER_API_URL', 'CONTEXT_KEEPER_TOKEN']) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function okResponse() {
  return new Response(JSON.stringify({ saved: 1, skipped: 0 }), { status: 200 });
}

describe('syncDecisionsToWeb', () => {
  it('posts decisions to the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());

    await syncDecisionsToWeb('/home/user/app', ['chose X over Y because Z'], queueDir);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('https://example.com/api/decisions');
    const body = JSON.parse(String(init?.body));
    expect(body.projectPath).toBe('/home/user/app');
    expect(body.decisions[0].text).toBe('chose X over Y because Z');
  });

  it('persists the payload to the disk queue when the API is down', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const promise = syncDecisionsToWeb('/home/user/app', ['chose X because Y'], queueDir);
    await vi.runAllTimersAsync();
    await promise;

    const files = fs.readdirSync(queueDir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(1);
    const payload = JSON.parse(fs.readFileSync(path.join(queueDir, files[0]), 'utf-8'));
    expect(payload.decisions[0].text).toBe('chose X because Y');
  });

  it('skips silently in offline mode (no API URL)', async () => {
    delete process.env.CONTEXT_KEEPER_API_URL;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await syncDecisionsToWeb('/home/user/app', ['chose X because Y'], queueDir);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(queueDir)).toBe(false);
  });
});

describe('replayPendingSync', () => {
  it('replays queued payloads and removes them on success', async () => {
    persistPayload({ projectPath: '/a', decisions: [{ text: 'd1', createdAt: 'x' }] }, queueDir);
    persistPayload({ projectPath: '/b', decisions: [{ text: 'd2', createdAt: 'y' }] }, queueDir);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse());
    await replayPendingSync(queueDir);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fs.readdirSync(queueDir).filter((f) => f.endsWith('.json'))).toHaveLength(0);
  });

  it('stops at the first failure and keeps remaining entries', async () => {
    persistPayload({ projectPath: '/a', decisions: [{ text: 'd1', createdAt: 'x' }] }, queueDir);
    persistPayload({ projectPath: '/b', decisions: [{ text: 'd2', createdAt: 'y' }] }, queueDir);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('still down'));
    await replayPendingSync(queueDir);

    expect(fs.readdirSync(queueDir).filter((f) => f.endsWith('.json'))).toHaveLength(2);
  });

  it('discards malformed queue entries', async () => {
    fs.mkdirSync(queueDir, { recursive: true });
    fs.writeFileSync(path.join(queueDir, '000-bad.json'), 'not json');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse());
    await replayPendingSync(queueDir);

    expect(fs.readdirSync(queueDir).filter((f) => f.endsWith('.json'))).toHaveLength(0);
  });
});
