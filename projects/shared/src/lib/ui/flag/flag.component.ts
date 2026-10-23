import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { LanguageService } from '../../services/language.service';
import { FLAG_CDN_BASE_URL } from '../../services/country-catalog.service';

@Component({
  selector: 'app-flag',
  imports: [IconComponent, NgOptimizedImage],
  templateUrl: './flag.component.html',
  styleUrl: './flag.component.scss',
})
export class FlagComponent {
  protected readonly messages = inject(LanguageService).messages;
  private readonly imageButton = viewChild<ElementRef<HTMLButtonElement>>('imageButton');
  readonly error = input(false);
  readonly success = input(false);
  readonly image = input<readonly string[]>([]);
  readonly name = input('Flag');
  readonly aspectRatio = input(0);
  readonly priority = input(false);
  readonly selectable = input(false);
  readonly disabled = input(false);
  readonly selected = output<string>();
  protected readonly index = signal(0);
  protected readonly imageSource = computed(() => {
    const filename = this.image()[this.index()];
    return filename
      ? filename.endsWith('.svg')
        ? `${FLAG_CDN_BASE_URL}${encodeURIComponent(filename)}`
        : `/images/flags/${filename}`
      : null;
  });

  nextFlag() {
    const imageCount = this.image().length;
    if (imageCount > 1) this.index.update((index) => (index + 1) % imageCount);
  }

  selectFlag() {
    const source = this.imageSource();
    if (source) this.selected.emit(source);
  }

  focus(): void {
    this.imageButton()?.nativeElement.focus();
  }
}
