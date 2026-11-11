import {
  afterNextRender,
  effect,
  Directive,
  ElementRef,
  HostListener,
  inject,
  Injector,
  OnInit,
  viewChild,
  viewChildren,
} from '@angular/core';
import { QuizService } from '../services/quiz.service';
import { LanguageService } from '../services/language.service';
import { ButtonComponent } from '../ui/button/button.component';
import { FlagComponent } from '../ui/flag/flag.component';
import { QuizActionComponent } from './quiz-action.component';
import { QUIZ_LAYOUT } from '../services/quiz-main-button';

@Directive()
export abstract class QuizPageBase implements OnInit {
  private readonly injector = inject(Injector);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly quizService = inject(QuizService);
  protected readonly miniappLayout = inject(QUIZ_LAYOUT) === 'miniapp';
  protected readonly language = inject(LanguageService).language;
  protected readonly messages = inject(LanguageService).messages;
  private readonly answers = viewChildren<ButtonComponent | FlagComponent>('answerOption');
  private readonly actionButton = viewChild(QuizActionComponent);

  constructor() {
    effect(() => {
      if (this.quizService.completed()) {
        afterNextRender(
          () => this.element.nativeElement.querySelector<HTMLElement>('.round-results h1')?.focus(),
          { injector: this.injector },
        );
      }
    });
  }

  protected restartSession(): void {
    this.quizService.restart();
    this.focusFirstAnswer();
  }

  protected repeatMistakes(): void {
    this.quizService.repeatMistakes();
    this.focusFirstAnswer();
  }

  private focusFirstAnswer(): void {
    afterNextRender(
      () => {
        if (this.quizService.noChoices()) this.actionButton()?.focus();
        else this.answers()[0]?.focus();
      },
      { injector: this.injector },
    );
  }

  ngOnInit(): void {
    this.quizService.nextQuestion();
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      this.quizService.status() !== 'ready'
    )
      return;
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
    )
      return;
    const interactive = target?.closest(
      'button, a, summary, [role]:not([role="main"]):not([role="region"]):not([role="group"]), [tabindex]:not([tabindex="-1"])',
    );
    const options = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.countries app-button button, .countries .flag__image-button',
      ),
    );
    const focusedIndex = options.indexOf(interactive as HTMLButtonElement);
    // Native Enter/Space activation belongs to the focused button, never both handlers.
    if (interactive && (focusedIndex < 0 || event.key === 'Enter')) return;
    if (event.key === 'Enter') {
      if (!this.quizService.noChoices() && !this.quizService.hasAnswered()) return;
      event.preventDefault();
      this.activateAction();
      return;
    }
    if (this.quizService.hasAnswered()) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && options.length) {
      const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const index =
        focusedIndex < 0
          ? backwards
            ? options.length - 1
            : 0
          : (focusedIndex + (backwards ? -1 : 1) + options.length) % options.length;
      event.preventDefault();
      this.answers()[index]?.focus();
      return;
    }
    if (!this.quizService.noChoices() && /^[0-9]$/.test(event.key)) {
      const index = event.key === '0' ? 9 : Number(event.key) - 1;
      if (index >= this.answers().length) return;
      event.preventDefault();
      this.selectAnswer(index);
    }
  }

  protected selectAnswer(index: number): void {
    if (this.quizService.status() !== 'ready' || this.quizService.hasAnswered()) return;
    this.quizService.selectAnswer(index);
    this.focusActionButton();
  }

  protected activateAction(): void {
    const action = this.quizService.primaryAction();
    if (this.quizService.status() !== 'ready' || !action.enabled) return;
    this.quizService.activatePrimaryAction();
    if (action.kind === 'reveal') {
      this.focusActionButton();
      return;
    }
    if (this.quizService.usesTelegramMainButton()) return;
    this.focusFirstAnswer();
  }

  private focusActionButton(): void {
    if (this.quizService.usesTelegramMainButton()) return;
    afterNextRender(() => this.actionButton()?.focus(), { injector: this.injector });
  }
}
