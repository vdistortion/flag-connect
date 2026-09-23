import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebStorageService {
  get(key: string) {
    if (typeof window === 'undefined') {
      return null; // или другое значение по умолчанию
    }
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : value;
  }

  set<T>(key: string, data: T) {
    if (typeof window === 'undefined') {
      return;
    }
    const value = JSON.stringify(data);
    window.localStorage.setItem(key, value);
  }

  delete(key: string) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }
}
