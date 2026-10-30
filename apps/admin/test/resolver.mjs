import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs'];

function withExtension(fileUrl) {
  const file = fileURLToPath(fileUrl);
  if (/\.[a-z]+$/i.test(file) && existsSync(file)) return fileUrl;
  for (const ext of EXTENSIONS) {
    if (existsSync(file + ext)) return pathToFileURL(file + ext).href;
  }
  for (const ext of EXTENSIONS) {
    const index = path.join(file, `index${ext}`);
    if (existsSync(index)) return pathToFileURL(index).href;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const target = withExtension(pathToFileURL(path.join(SRC, specifier.slice(2))).href);
    if (target) return next(target, context);
  }
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  if (relative && context.parentURL) {
    const target = withExtension(new URL(specifier, context.parentURL).href);
    if (target) return next(target, context);
  }
  return next(specifier, context);
}
