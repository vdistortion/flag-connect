import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button.component';
import { SHOW_HOME_SETTINGS } from '../../services/quiz-main-button';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  protected readonly showSettings = inject(SHOW_HOME_SETTINGS);
}
