export interface Country {
  /** ISO 3166-1 alpha-2; Kosovo uses the user-assigned code XK. */
  readonly code: string;
  readonly name: {
    readonly en: string;
    readonly ru: string;
  };
  readonly flag: readonly string[];
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
