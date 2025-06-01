import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button.component';
import { TelegramApiService } from '../../services/telegram-api.service';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  protected tg = inject(TelegramApiService);
}
