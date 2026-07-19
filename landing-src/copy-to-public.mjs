import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(here, 'dist');
const publicDir = path.join(here, '..', 'public');
const publicAssetsDir = path.join(publicDir, 'assets');

if (!fs.existsSync(distDir)) {
  throw new Error(`Build output not found at ${distDir}. Run "vite build" first.`);
}

// public/assets is exclusively the landing page's hashed bundle output,
// so it's safe to fully replace on every build. app.html/app.js/style.css live
// directly under public/ and are untouched.
fs.rmSync(publicAssetsDir, { recursive: true, force: true });
fs.cpSync(path.join(distDir, 'assets'), publicAssetsDir, { recursive: true });
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(publicDir, 'index.html'));

console.log('Landing page built and copied into public/');
