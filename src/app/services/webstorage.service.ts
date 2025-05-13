import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WebStorageService {
  get(key: string) {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : value;
  }

  set<T = any>(key: string, data: T) {
    const value = JSON.stringify(data);
    window.localStorage.setItem(key, value);
  }

  delete(key: string) {
    window.localStorage.removeItem(key);
  }
}
