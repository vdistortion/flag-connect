import { createQuestion, type Country, type QuizQuestion } from '@flag-connect/flag-domain';

export interface Player {
  id: string;
  name: string;
  active: boolean;
  correct: number;
  wrong: number;
  skipped: number;
  consecutiveSkips: number;
}

/** Transport-independent party: participant IDs are user IDs, never chat IDs. */
export class GroupMatch {
  readonly players = new Map<string, Player>();
  readonly questions: QuizQuestion[] = [];
  readonly answers = new Map<string, number>();
  phase: 'lobby' | 'playing' | 'finished' = 'lobby';
  round = 0;
  constructor(
    readonly id: string,
    readonly creatorId: string,
    name: string,
    readonly countries: readonly Country[],
    private readonly random = Math.random,
  ) {
    this.join(creatorId, name);
  }
  join(id: string, name: string): string {
    if (this.phase === 'finished') return 'Игра завершена';
    if (this.phase === 'playing' && !this.players.has(id)) return 'Дождитесь следующей игры';
    const existing = this.players.get(id);
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        existing.consecutiveSkips = 0;
      }
    } else {
      if (this.players.size >= 12) return 'Лобби полно (максимум 12)';
      this.players.set(id, {
        id,
        name: name.replace(/[\r\n\t]/g, ' ').slice(0, 24),
        active: true,
        correct: 0,
        wrong: 0,
        skipped: 0,
        consecutiveSkips: 0,
      });
    }
    return 'Вы в игре';
  }
  leave(id: string): string {
    const player = this.players.get(id);
    if (!player || this.phase === 'finished') return 'Вы не активный участник';
    if (this.phase === 'lobby') this.players.delete(id);
    else {
      player.active = false;
      this.advanceIfAnswered();
    }
    return 'Вы вышли';
  }
  start(id: string): string {
    if (id !== this.creatorId) return 'Начать может только создатель';
    if (this.phase !== 'lobby') return 'Игра уже началась';
    if (this.players.size < 2) return 'Нужны хотя бы два игрока';
    if (this.countries.length < 10) throw new RangeError('Need ten countries');
    const targets = [...this.countries];
    for (let i = 0; i < 10; i++) {
      const j =
        i + Math.min(targets.length - i - 1, Math.floor(this.random() * (targets.length - i)));
      [targets[i], targets[j]] = [targets[j], targets[i]];
      this.questions.push(createQuestion(4, this.random, this.countries, targets[i].code));
    }
    this.phase = 'playing';
    return 'Игра началась';
  }
  answer(id: string, round: number, choice: number): string {
    if (
      this.phase !== 'playing' ||
      round !== this.round ||
      !Number.isInteger(choice) ||
      choice < 0 ||
      choice > 3
    )
      return 'Вопрос устарел';
    if (!this.players.get(id)?.active) return 'Вы не активный участник';
    if (this.answers.has(id)) return 'Ответ уже принят';
    this.answers.set(id, choice);
    this.advanceIfAnswered();
    return 'Ответ принят';
  }
  private advanceIfAnswered(): void {
    const active = [...this.players.values()].filter((p) => p.active);
    if (active.length === 0) {
      this.closeRound();
      this.phase = 'finished';
    } else if (active.every((p) => this.answers.has(p.id))) this.closeRound();
  }
  private closeRound(): void {
    const correct = this.questions[this.round].correctAnswerIndex;
    for (const player of this.players.values()) {
      const answer = this.answers.get(player.id);
      if (answer !== undefined) {
        if (answer === correct) player.correct++;
        else player.wrong++;
        player.consecutiveSkips = 0;
      } else {
        player.skipped++;
        if (player.active && ++player.consecutiveSkips >= 3) player.active = false;
      }
    }
    this.answers.clear();
    this.round++;
    if (this.round === 10 || ![...this.players.values()].some((p) => p.active))
      this.phase = 'finished';
  }
  expire(round: number): boolean {
    if (this.phase !== 'playing' || this.round !== round) return false;
    this.closeRound();
    return true;
  }
  stop(id: string): string {
    if (id !== this.creatorId) return 'Остановить может только создатель';
    if (this.phase === 'playing') {
      this.closeRound();
    }
    this.phase = 'finished';
    return 'Игра остановлена';
  }
}
