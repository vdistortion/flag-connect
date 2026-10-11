import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebStorageService {
  get<T>(key: string): T | null {
    const value = this.storage()?.getItem(key);
    if (value == null) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T) {
    const storage = this.storage();
    if (!storage) return;

    try {
      const value = JSON.stringify(data);
      if (value !== undefined) storage.setItem(key, value);
    } catch {
      // Storage may be unavailable or full; callers retain their in-memory state.
    }
  }

  delete(key: string) {
    try {
      this.storage()?.removeItem(key);
    } catch {
      // Storage may be unavailable.
    }
  }

  private storage(): Storage | null {
    if (typeof window === 'undefined') return null;

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
