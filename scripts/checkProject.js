const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const javascriptFiles = [
  ...walk(path.join(root, 'server')),
  ...walk(path.join(root, 'scripts')),
  path.join(root, 'public', 'app.js'),
  path.join(root, 'public', 'api-client.js'),
  path.join(root, 'public', 'runtime-config.js')
].filter((file) => file.endsWith('.js'));

for (const file of javascriptFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const tscPath = path.join(root, 'landing-src', 'node_modules', 'typescript', 'bin', 'tsc');
execFileSync(process.execPath, [tscPath, '--project', path.join(root, 'landing-src', 'tsconfig.json'), '--noEmit'], {
  cwd: root,
  stdio: 'inherit'
});

console.log(`Project checks passed (${javascriptFiles.length} JavaScript files + TypeScript + vercel.json).`);
