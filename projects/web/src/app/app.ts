import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from 'shared';
import { LanguageService } from 'shared';

@Component({
  imports: [HeaderComponent, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly language = inject(LanguageService).language;
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');
  protected focusPage(): void {
    this.main()?.nativeElement.focus({ preventScroll: true });
  }
}
