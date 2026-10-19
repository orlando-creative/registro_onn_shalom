import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, 'dist');
const htmlPages = ['index.html', 'dashboard.html', 'detalle.html', 'login.html'];
const sqlFiles = ['schema.sql', 'policies.sql', 'storage.sql'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of htmlPages) {
  await cp(path.join(root, file), path.join(output, file));
}

for (const directory of ['assets', 'css', 'js']) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

const sqlOutput = path.join(output, 'supabase');
await mkdir(sqlOutput, { recursive: true });
for (const file of sqlFiles) {
  await cp(path.join(root, 'supabase', file), path.join(sqlOutput, file));
}
await cp(path.join(root, 'supabase', 'migrations'), path.join(sqlOutput, 'migrations'), { recursive: true });
await cp(path.join(root, 'manifest.webmanifest'), path.join(output, 'manifest.webmanifest'));
await cp(path.join(root, 'sw.js'), path.join(output, 'sw.js'));
const exceljsOutput = path.join(output, 'node_modules', 'exceljs', 'dist');
await mkdir(exceljsOutput, { recursive: true });
await cp(
  path.join(root, 'node_modules', 'exceljs', 'dist', 'exceljs.min.js'),
  path.join(exceljsOutput, 'exceljs.min.js'),
);

console.log(`Static site copied to ${output}`);
