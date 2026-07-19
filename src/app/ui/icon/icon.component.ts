import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import 'iconify-icon';

// https://icon-sets.iconify.design/
@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class IconComponent {
  icon = input.required<string>();
  size = input<number>();
  width = input<number>();
  height = input<number>();

  effectiveWidth = computed(() => this.width() ?? this.size() ?? null);
  effectiveHeight = computed(() => this.height() ?? this.size() ?? null);
}
