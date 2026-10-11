import { flagConnectRoutes } from './routes';

describe('flagConnectRoutes', () => {
  it('provides the shared quiz, country list, and settings pages', () => {
    expect(flagConnectRoutes.map((route) => route.path)).toEqual([
      '',
      'list',
      'quiz/flag',
      'quiz/country',
      'settings',
    ]);
  });
});
