import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';

export interface NumberedFlag {
  readonly code: string;
  readonly filename: string;
  readonly number: number;
}

const PANEL_WIDTH = 440;
const FLAG_PANEL_HEIGHT = 293;
const LABEL_HEIGHT = 48;
const IMAGE_PADDING = 4;
const PANEL_GAP = 8;
const MATTE = { r: 184, g: 190, b: 198, alpha: 1 };
const MATTE_HEX = '#B8BEC6';
const BADGE_COLOR = '#533B8A';
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
let lastCleanupAt = 0;

const DIGIT_PATHS: Readonly<Record<string, string>> = {
  '0': 'M12 3 C6.8 3 5 7 5 18 C5 29 6.8 33 12 33 C17.2 33 19 29 19 18 C19 7 17.2 3 12 3 Z',
  '1': 'M7 9 L12 4 L12 33 M7 33 H18',
  '2': 'M5 9 C5 4 9 3 13 3 C18 3 20 6 20 10 C20 15 16 18 5 29 L5 33 H20',
  '3': 'M5 5 H15 C21 5 21 14 15 17 C23 19 21 33 14 33 H5',
  '4': 'M16 33 V4 L4 22 H21',
  '5': 'M20 4 H6 V16 H14 C23 16 22 33 14 33 H5',
  '6': 'M19 4 H12 C6 4 4 10 4 19 C4 28 7 33 13 33 C20 33 21 27 21 23 C21 17 18 14 13 14 C9 14 6 17 4 21',
  '7': 'M4 4 H21 L10 33',
  '8': 'M12 3 C4 3 4 15 12 17 C20 15 20 3 12 3 Z M12 17 C3 17 3 33 12 33 C21 33 21 17 12 17 Z',
  '9': 'M20 18 C20 8 18 3 12 3 C5 3 4 8 4 13 C4 20 8 22 13 20 C17 19 19 16 20 13 M20 14 V28 C20 32 17 33 13 33 H7',
};

function numberLabelSvg(number: number): Buffer {
  const digits = String(number);
  if (!/^\d{1,2}$/.test(digits)) throw new RangeError('Flag label must be between 0 and 99');

  const digitWidth = 24;
  const digitHeight = 36;
  const digitGap = 3;
  const textWidth = digits.length * digitWidth + (digits.length - 1) * digitGap;
  const badgeWidth = textWidth + 16;
  const badgeHeight = 40;
  const badgeX = Math.round((PANEL_WIDTH - badgeWidth) / 2);
  const badgeY = Math.round((LABEL_HEIGHT - badgeHeight) / 2);
  const textX = Math.round((PANEL_WIDTH - textWidth) / 2);
  const textY = Math.round((LABEL_HEIGHT - digitHeight) / 2);
  const paths = [...digits]
    .map(
      (digit, digitIndex) =>
        `<path d="${DIGIT_PATHS[digit]}" transform="translate(${textX + digitIndex * (digitWidth + digitGap)} ${textY})"/>`,
    )
    .join('');

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH}" height="${LABEL_HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${LABEL_HEIGHT}"><rect width="100%" height="100%" fill="${MATTE_HEX}"/><rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="12" fill="${BADGE_COLOR}"/><g fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`,
  );
}

async function pruneExpiredImages(directory: string): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.webp'))
      .map(async (entry) => {
        const path = join(directory, entry.name);
        if (now - (await stat(path)).mtimeMs > MAX_CACHE_AGE_MS) await unlink(path);
      }),
  );
}

export async function createNumberedFlagImage(
  flags: readonly NumberedFlag[],
  sourceDirectory: string,
  outputDirectory: string,
): Promise<string> {
  if (flags.length < 1 || flags.length > 2) {
    throw new RangeError('A numbered flag image must contain one or two flags');
  }
  for (const flag of flags) {
    if (!Number.isInteger(flag.number) || flag.number < 1 || flag.number > 10) {
      throw new RangeError('Flag labels must be integers between 1 and 10');
    }
  }

  await pruneExpiredImages(outputDirectory);

  const sourceImages = await Promise.all(
    flags.map(async (flag) => {
      const filename = basename(flag.filename);
      const source = await sharp(join(sourceDirectory, filename)).rotate().toBuffer();
      const image = await sharp(source)
        .resize(PANEL_WIDTH - IMAGE_PADDING * 2, FLAG_PANEL_HEIGHT - IMAGE_PADDING * 2, {
          fit: 'contain',
          position: flag.code === 'NP' ? 'west' : 'centre',
          background: MATTE,
        })
        .flatten({ background: MATTE })
        .png()
        .toBuffer();

      return { flag, filename, source, image };
    }),
  );

  const cacheKey = createHash('sha256')
    .update('numbered-country-flags-v2\n')
    .update(
      sourceImages
        .map(({ flag, filename, source }) =>
          [
            flag.code,
            flag.number,
            filename,
            createHash('sha256').update(source).digest('hex'),
          ].join(':'),
        )
        .join('\n'),
    )
    .digest('hex');
  const outputFilename = `${cacheKey}.webp`;
  const outputPath = join(outputDirectory, outputFilename);

  try {
    await access(outputPath);
    return outputFilename;
  } catch {
    // Generate the cached image below.
  }

  const outerPadding = IMAGE_PADDING;
  const panelCount = flags.length;
  const width = panelCount * PANEL_WIDTH + (panelCount - 1) * PANEL_GAP + outerPadding * 2;
  const height = outerPadding + FLAG_PANEL_HEIGHT + LABEL_HEIGHT + outerPadding;
  const layers: OverlayOptions[] = [];

  sourceImages.forEach(({ flag, image }, index) => {
    const panelX = outerPadding + index * (PANEL_WIDTH + PANEL_GAP);
    layers.push({ input: image, left: panelX + IMAGE_PADDING, top: outerPadding + IMAGE_PADDING });
    layers.push({
      input: numberLabelSvg(flag.number),
      left: panelX,
      top: outerPadding + FLAG_PANEL_HEIGHT,
    });
  });

  await mkdir(outputDirectory, { recursive: true });
  const temporaryPath = join(outputDirectory, `.${cacheKey}.${randomUUID()}.tmp.webp`);
  try {
    await sharp({
      create: { width, height, channels: 3, background: MATTE },
    })
      .composite(layers)
      .webp({ lossless: true, effort: 5 })
      .toFile(temporaryPath);
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }

  return outputFilename;
}
