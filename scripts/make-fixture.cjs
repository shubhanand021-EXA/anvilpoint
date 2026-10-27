const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

(async () => {
  const z = new JSZip();
  const root = 'sample-app/';
  z.file(root + 'package.json', JSON.stringify({
    name: 'sample-app',
    version: '0.1.0',
    license: 'MIT',
    scripts: { test: 'vitest run', build: 'vite build' },
  }, null, 2));
  z.file(root + 'README.md', '# sample-app\n\nDemo project for FORGEKIT verification.\n');
  z.file(root + 'src/index.ts', 'export function add(a: number, b: number): number {\n  return a + b;\n}\n');
  z.file(root + 'src/add.test.ts', "import { describe, expect, it } from 'vitest';\n");
  z.file(root + 'requirements.txt', 'requests>=2.0\n');
  const buf = await z.generateAsync({ type: 'nodebuffer' });
  fs.mkdirSync(path.join(__dirname, '..', 'tests', 'fixtures'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'sample-app.zip'), buf);
  console.log('wrote sample-app.zip', buf.length, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
