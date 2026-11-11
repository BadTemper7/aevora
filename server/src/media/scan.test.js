import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanUploadedFile } from './scan.js';

test('ClamAV exit statuses are never treated as clean except zero', { concurrency: false }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'aevora-scan-'));
  const old = { command: process.env.CLAMAV_COMMAND, mode: process.env.NODE_ENV };
  try {
    process.env.NODE_ENV = 'production';
    const script = path.join(dir, 'scanner');
    for (const status of [0, 1, 2]) {
      await writeFile(script, `#!/bin/sh\nexit ${status}\n`);
      await chmod(script, 0o700);
      process.env.CLAMAV_COMMAND = script;
      if (status === 0) await scanUploadedFile(path.join(dir, 'nonexistent'));
      else await assert.rejects(scanUploadedFile(path.join(dir, 'nonexistent')), (error) => {
        assert.equal(error.statusCode, status === 1 ? 415 : 503);
        assert.equal(error.code, status === 1 ? 'MALWARE_DETECTED' : 'SCAN_FAILED');
        return true;
      });
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (old.command === undefined) delete process.env.CLAMAV_COMMAND;
    else process.env.CLAMAV_COMMAND = old.command;
    if (old.mode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old.mode;
  }
});
