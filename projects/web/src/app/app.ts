import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from 'shared';

@Component({
  imports: [HeaderComponent, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
