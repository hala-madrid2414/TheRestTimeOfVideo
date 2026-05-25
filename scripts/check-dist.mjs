import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.resolve(projectRoot, 'dist');

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function assertExists(relativePath) {
  const absPath = path.resolve(distRoot, relativePath);
  if (!(await pathExists(absPath))) {
    throw new Error(`Missing: dist/${relativePath}`);
  }
}

async function readJson(relativePath) {
  const absPath = path.resolve(distRoot, relativePath);
  const raw = await fs.readFile(absPath, 'utf8');
  return JSON.parse(raw);
}

async function listFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (ent) => {
      const p = path.resolve(dir, ent.name);
      if (ent.isDirectory()) return listFilesRecursively(p);
      return [p];
    })
  );
  return files.flat();
}

function parseHtmlAssetRefs(html) {
  const refs = new Set();
  for (const m of html.matchAll(/\s(?:src|href)=["']([^"']+)["']/g)) {
    refs.add(m[1]);
  }
  return [...refs];
}

function normalizeDistRelative(p) {
  const withoutQuery = p.split('?')[0].split('#')[0];
  if (withoutQuery.startsWith('./')) return withoutQuery.slice(2);
  if (withoutQuery.startsWith('/')) return withoutQuery.slice(1);
  return withoutQuery;
}

async function assertManifestReferences() {
  await assertExists('manifest.json');
  const manifest = await readJson('manifest.json');

  if (manifest.action?.default_popup) {
    await assertExists(manifest.action.default_popup);
  }

  const icons = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {})
  ];
  for (const iconPath of icons) {
    await assertExists(iconPath);
  }

  if (manifest.background?.service_worker) {
    await assertExists(manifest.background.service_worker);
  }

  for (const cs of manifest.content_scripts ?? []) {
    for (const jsPath of cs.js ?? []) {
      await assertExists(jsPath);
    }
    for (const cssPath of cs.css ?? []) {
      await assertExists(cssPath);
    }
  }
}

async function assertHtmlReferences() {
  const htmlFiles = ['popup.html', 'index.html'];
  for (const htmlFile of htmlFiles) {
    const absPath = path.resolve(distRoot, htmlFile);
    if (!(await pathExists(absPath))) continue;
    const html = await fs.readFile(absPath, 'utf8');
    const refs = parseHtmlAssetRefs(html)
      .map(normalizeDistRelative)
      .filter((p) => p.length > 0);

    for (const ref of refs) {
      if (ref.startsWith('http:') || ref.startsWith('https:') || ref.startsWith('data:')) {
        continue;
      }
      await assertExists(ref);
    }
  }
}

async function assertNoHashedFilenames() {
  if (!(await pathExists(distRoot))) {
    throw new Error('Missing dist/ directory, run build first');
  }

  const files = await listFilesRecursively(distRoot);
  const hashed = files
    .map((f) => path.relative(distRoot, f).replaceAll('\\', '/'))
    .filter((rel) => /[.-][a-f0-9]{8,}\./i.test(rel));

  if (hashed.length > 0) {
    throw new Error(`Hashed filenames found:\n${hashed.map((p) => `- ${p}`).join('\n')}`);
  }
}

async function assertMinimumStructure() {
  await assertExists('popup.html');
  await assertExists('assets');
}

async function main() {
  await assertMinimumStructure();
  await assertManifestReferences();
  await assertHtmlReferences();
  await assertNoHashedFilenames();
  console.log('dist check passed');
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
