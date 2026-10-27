import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

describe('desktop packaging config', () => {
  it('declares a sandboxed electron entry point and builder config', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as Record<string, unknown>;
    expect(pkg['main']).toBe('electron/main.cjs');
    const build = pkg['build'] as Record<string, unknown>;
    expect(build['appId']).toBe('com.anvilpoint.app');
    expect(build['productName']).toBe('Anvilpoint');
    expect(existsSync(join(ROOT, 'electron', 'main.cjs'))).toBe(true);
    expect(existsSync(join(ROOT, 'electron', 'preload.cjs'))).toBe(true);
    expect(existsSync(join(ROOT, 'build', 'icon.ico'))).toBe(true);
  });

  it('main process denies node integration and opens externals in the browser', () => {
    const main = readFileSync(join(ROOT, 'electron', 'main.cjs'), 'utf-8');
    expect(main).toContain('nodeIntegration: false');
    expect(main).toContain('contextIsolation: true');
    expect(main).toContain('sandbox: true');
    expect(main).toContain('openExternal');
  });
});
