import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.resolve(projectRoot, 'dist');

const filesToCopy = [
  'manifest.json'
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function copyFileToDist(relativeFilePath) {
  const from = path.resolve(projectRoot, relativeFilePath);
  const to = path.resolve(distRoot, relativeFilePath);
  await ensureDir(path.dirname(to));
  await fs.copyFile(from, to);
}

async function copyDirToDist(relativeDirPath) {
  const from = path.resolve(projectRoot, relativeDirPath);
  const to = path.resolve(distRoot, relativeDirPath);
  await ensureDir(path.dirname(to));
  await fs.cp(from, to, { recursive: true, force: true });
}

await ensureDir(distRoot);

await Promise.all(filesToCopy.map(copyFileToDist));
await copyDirToDist('images');
