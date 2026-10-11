import countryData from './countries.json' with { type: 'json' };

export interface Country {
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

export const countries: readonly Country[] = Object.freeze(countryData);

function randomIndex(length: number, random: () => number): number {
  return Math.min(Math.floor(random() * length), length - 1);
}

/** Creates a quiz question without repeating countries. */
export function createQuestion(count = 4, random = Math.random): QuizQuestion {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new RangeError('Question choice count must be an integer between 1 and 10');
  }

  if (count > countries.length) {
    throw new RangeError(`Cannot create ${count} choices from ${countries.length} countries`);
  }

  const indexes = Array.from({ length: countries.length }, (_, index) => index);
  for (let index = 0; index < count; index += 1) {
    const selectedIndex = index + randomIndex(indexes.length - index, random);
    [indexes[index], indexes[selectedIndex]] = [indexes[selectedIndex], indexes[index]];
  }

  const countryIndexes = indexes.slice(0, count);
  return {
    countryIndexes,
    countries: countryIndexes.map((index) => countries[index]),
    correctAnswerIndex: randomIndex(count, random),
  };
}
