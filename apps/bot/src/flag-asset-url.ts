import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export async function versionedFlagUrl(
  baseUrl: string,
  assetDirectory: string,
  filename: string,
): Promise<string> {
  const safeFilename = basename(filename);
  let version: string;

  try {
    const contents = await readFile(join(assetDirectory, safeFilename));
    version = createHash('sha256').update(contents).digest('hex').slice(0, 16);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' || process.env.NODE_ENV === 'production') throw error;
    version = process.env.BOT_FLAG_ASSET_VERSION ?? 'dev';
  }

  return `${baseUrl}${encodeURIComponent(safeFilename)}?v=${version}`;
}
