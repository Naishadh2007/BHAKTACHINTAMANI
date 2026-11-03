import { cp, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(frontend, 'dist');
const backend = path.resolve(frontend, '../backend');
const entries = await readdir(dist, { withFileTypes: true });

for (const target of [backend, path.join(backend, 'public')]) {
  await mkdir(target, { recursive: true });
  // Copy frontend assets only; preserve backend PHP scripts and routing config.
  for (const entry of entries) {
    if (entry.name === 'index.html' || entry.name.startsWith('.') || entry.name.endsWith('.php')) continue;
    await cp(path.join(dist, entry.name), path.join(target, entry.name), { recursive: true });
  }
  // Publish the entry point after its referenced assets are in place.
  await cp(path.join(dist, 'index.html'), path.join(target, 'index.html'));
}
console.log('Updated frontend assets in backend/ and backend/public/.');
