import { inject, Injectable } from '@angular/core';
import { WebStorageService } from './webstorage.service';

const DEFAULT_VALUES = {
  COUNT: 4,
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private storageService = inject(WebStorageService);

  set count(value: number) {
    if (value === DEFAULT_VALUES.COUNT) this.storageService.delete('fc-count');
    else this.storageService.set('fc-count', value);
  }

  get count() {
    return this.storageService.get('fc-count') || DEFAULT_VALUES.COUNT;
  }
}
