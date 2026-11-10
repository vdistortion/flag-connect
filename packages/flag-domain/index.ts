export const COUNTRY_CATALOG_URL =
  'https://cdn.jsdelivr.net/gh/vdistortion/country-flags@0.1.0/countries.json';

export interface Country {
  /** ISO 3166-1 alpha-2; Kosovo uses the user-assigned code XK. */
  readonly code: string;
  readonly name: {
    readonly en: string;
    readonly ru: string;
  };
  readonly flag: readonly string[];
}

/** Parse the JSON catalog received from the CDN. */
export function parseCountryCatalog(data: unknown): readonly Country[] {
  if (!Array.isArray(data)) throw new Error('Country catalog must be an array');
  if (data.length < 10) throw new Error('Country catalog must contain at least 10 countries');
  const codes = new Set<string>();
  for (const entry of data) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !entry.name ||
      typeof entry.name !== 'object' ||
      typeof entry.name.en !== 'string' ||
      !entry.name.en.trim() ||
      typeof entry.name.ru !== 'string' ||
      !entry.name.ru.trim()
    ) {
      throw new Error('Invalid country name');
    }
    if (typeof entry.code !== 'string' || !/^[A-Z]{2}$/.test(entry.code) || codes.has(entry.code)) {
      throw new Error('Invalid or duplicate country code');
    }
    codes.add(entry.code);
    if (
      !Array.isArray(entry.flag) ||
      entry.flag.length === 0 ||
      !entry.flag.every(
        (filename: unknown) =>
          typeof filename === 'string' && /^[A-Za-z0-9_-]+\.svg$/.test(filename),
      )
    ) {
      throw new Error(`Invalid SVG flag filenames for ${entry.code}`);
    }
  }
  return data as readonly Country[];
}

export interface QuizQuestion {
  countries: Country[];
  countryIndexes: number[];
  correctAnswerIndex: number;
}

function randomIndex(length: number, random: () => number): number {
  return Math.min(Math.floor(random() * length), length - 1);
}

/** Creates a quiz question without repeating countries. */
export function createQuestion(
  count = 4,
  random = Math.random,
  catalog: readonly Country[],
): QuizQuestion {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new RangeError('Question choice count must be an integer between 1 and 10');
  }

  if (count > catalog.length) {
    throw new RangeError(`Cannot create ${count} choices from ${catalog.length} countries`);
  }

  const indexes = Array.from({ length: catalog.length }, (_, index) => index);
  for (let index = 0; index < count; index += 1) {
    const selectedIndex = index + randomIndex(indexes.length - index, random);
    [indexes[index], indexes[selectedIndex]] = [indexes[selectedIndex], indexes[index]];
  }

  const countryIndexes = indexes.slice(0, count);
  return {
    countryIndexes,
    countries: countryIndexes.map((index) => catalog[index]),
    correctAnswerIndex: randomIndex(count, random),
  };
}
