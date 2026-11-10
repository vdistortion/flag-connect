import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button.component';
import { QUIZ_MAIN_BUTTON, SHOW_HOME_SETTINGS } from '../../services/quiz-main-button';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly configuredShowSettings = inject(SHOW_HOME_SETTINGS);
  private readonly mainButton = inject(QUIZ_MAIN_BUTTON, { optional: true });
  protected readonly showSettings = computed(
    () => this.configuredShowSettings || (this.mainButton !== null && !this.mainButton.available()),
  );
  protected readonly messages = inject(LanguageService).messages;
}
