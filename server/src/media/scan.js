import { spawn } from 'node:child_process';
import { AppError } from '../utils/AppError.js';

/**
 * Untrusted uploads require a real virus scanner in production unless they
 * pass the explicitly configured, limited community-branding sanitizer path.
 * Never treat a scan failure as a clean scan.
 */
export async function scanUploadedFile(filename) {
  const mode = process.env.NODE_ENV === 'production' ? 'required' : (process.env.MALWARE_SCAN_MODE || 'disabled');
  if (mode === 'disabled') return;
  if (mode !== 'required') throw new AppError('Invalid malware scanner configuration.', 500);

  return new Promise((resolve, reject) => {
    const command = process.env.CLAMAV_COMMAND || 'clamdscan';
    const child = spawn(command, ['--no-summary', filename], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let settled = false;
    const conclude = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };
    const timeout = setTimeout(() => child.kill('SIGKILL'), 120000);
    child.stderr.on('data', (chunk) => { stderr = (stderr + String(chunk)).slice(-400); });
    child.stdout.on('data', () => {});
    child.on('error', (error) => {
      console.error('[media-scan] Scanner process unavailable:', error.message);
      conclude(new AppError('Antivirus scanner is unavailable. Upload blocked. Contact the administrator.', 503, { code: 'SCANNER_UNAVAILABLE' }));
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      if (code === 0) return conclude();
      if (code === 1) return conclude(new AppError('Potential malware detected. Upload rejected.', 415, { code: 'MALWARE_DETECTED' }));
      console.error('[media-scan] Scanner failed:', { exitCode: code, signal, detail: stderr });
      conclude(new AppError('Antivirus scan could not complete. Upload blocked. Contact the administrator.', 503, { code: 'SCAN_FAILED' }));
    });
  });
}
