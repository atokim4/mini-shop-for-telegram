// Bundles src/ into assets/app.js (readable, not minified: the source ships with the plugin)
// and writes assets/app.asset.php with a content hash used as the script version.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const out = 'assets/app.js';
await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15', 'chrome90'],
  outfile: out,
  legalComments: 'none',
  banner: { js: '/* Mini Shop for Telegram. Built from src/ with esbuild (npm run build). GPL-2.0-or-later. */' },
});
const hash = createHash('sha256').update(await readFile(out)).update(await readFile('assets/app.css')).digest('hex').slice(0, 12);
await writeFile('assets/app.asset.php', `<?php return array( 'version' => '${hash}' );\n`);
console.log(`built ${out} (${hash})`);
