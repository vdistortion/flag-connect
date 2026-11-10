import type { Provider } from '@angular/core';
import { WebStorageService } from '../services/webstorage.service';

/** A fresh store per TestBed, independent of browser/Node persistent storage. */
export function provideTestStorage(): Provider {
  return {
    provide: WebStorageService,
    useFactory: () => {
      const values = new Map<string, unknown>();
      return {
        get: <T>(key: string): T | null => (values.get(key) as T | undefined) ?? null,
        set: <T>(key: string, value: T): void => {
          values.set(key, value);
        },
        delete: (key: string): void => {
          values.delete(key);
        },
      };
    },
  };
}
