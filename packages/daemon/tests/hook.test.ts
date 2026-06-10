import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { enqueueFromHookPayload, installSessionEndHook } from '../src/hook.js';
import { wasProcessed, markProcessed } from '../src/state.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-hook-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('enqueueFromHookPayload', () => {
  it('writes a queue entry from a SessionEnd payload', () => {
    const queueDir = path.join(tmpDir, 'queue');
    const payload = JSON.stringify({
      session_id: 'abc-123',
      transcript_path: '/home/user/.claude/projects/x/abc-123.jsonl',
      hook_event_name: 'SessionEnd',
    });

    const entryPath = enqueueFromHookPayload(payload, queueDir);
    expect(entryPath).toBeTruthy();

    const entry = JSON.parse(fs.readFileSync(entryPath!, 'utf-8'));
    expect(entry.transcriptPath).toBe('/home/user/.claude/projects/x/abc-123.jsonl');
    expect(entry.queuedAt).toBeTruthy();
  });

  it('returns null for payloads without transcript_path', () => {
    expect(enqueueFromHookPayload('{}', path.join(tmpDir, 'q'))).toBeNull();
  });

  it('returns null for malformed payloads', () => {
    expect(enqueueFromHookPayload('not json', path.join(tmpDir, 'q'))).toBeNull();
  });

  it('overwrites the entry for the same session (idempotent)', () => {
    const queueDir = path.join(tmpDir, 'queue');
    const payload = JSON.stringify({ transcript_path: '/x/abc.jsonl' });
    enqueueFromHookPayload(payload, queueDir);
    enqueueFromHookPayload(payload, queueDir);
    expect(fs.readdirSync(queueDir)).toHaveLength(1);
  });
});

describe('installSessionEndHook', () => {
  it('creates settings.json with the hook when none exists', () => {
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const result = installSessionEndHook(settingsPath);

    expect(result.status).toBe('installed');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionEnd[0].hooks[0].command).toBe('context-keeper hook-event');
  });

  it('preserves existing settings and hooks', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({
      model: 'opus',
      hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: 'other-tool' }] }] },
    }));

    installSessionEndHook(settingsPath);
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));

    expect(settings.model).toBe('opus');
    expect(settings.hooks.SessionEnd).toHaveLength(2);
    expect(settings.hooks.SessionEnd[0].hooks[0].command).toBe('other-tool');
  });

  it('is idempotent — does not duplicate the hook', () => {
    const settingsPath = path.join(tmpDir, 'settings.json');
    installSessionEndHook(settingsPath);
    const result = installSessionEndHook(settingsPath);

    expect(result.status).toBe('already-installed');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings.hooks.SessionEnd).toHaveLength(1);
  });
});

describe('processed state', () => {
  it('reports unprocessed transcripts as not processed', () => {
    const statePath = path.join(tmpDir, 'processed.json');
    const transcript = path.join(tmpDir, 'session.jsonl');
    fs.writeFileSync(transcript, '{}');

    expect(wasProcessed(transcript, statePath)).toBe(false);
  });

  it('marks and detects processed transcripts by mtime', () => {
    const statePath = path.join(tmpDir, 'processed.json');
    const transcript = path.join(tmpDir, 'session.jsonl');
    fs.writeFileSync(transcript, '{}');

    markProcessed(transcript, statePath);
    expect(wasProcessed(transcript, statePath)).toBe(true);
  });

  it('treats a transcript modified after processing as unprocessed', () => {
    const statePath = path.join(tmpDir, 'processed.json');
    const transcript = path.join(tmpDir, 'session.jsonl');
    fs.writeFileSync(transcript, '{}');

    markProcessed(transcript, statePath);
    // bump mtime well past the recorded value
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(transcript, future, future);

    expect(wasProcessed(transcript, statePath)).toBe(false);
  });

  it('returns false for missing transcript files', () => {
    const statePath = path.join(tmpDir, 'processed.json');
    expect(wasProcessed(path.join(tmpDir, 'nope.jsonl'), statePath)).toBe(false);
  });
});
