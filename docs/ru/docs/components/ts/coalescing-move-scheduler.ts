/**
 * Сериализует и объединяет (coalesce) частые события перетаскивания графика.
 *
 * Проблема, которую решает класс:
 *   События `EmptySpaceMoved` приходят намного чаще, чем обработчик перемещения
 *   успевает перерисовать окно (сгенерировать данные и подвинуть курсор). Без
 *   сериализации обработчики наложились бы друг на друга и разъехались с общим
 *   состоянием окна: визуально это выглядит как скачок на далёкий сегмент данных.
 *
 * Как решает:
 *   В любой момент времени выполняется не более одного обработчика. Все смещения,
 *   накопленные за время его работы, суммируются и обрабатываются ОДНИМ следующим
 *   вызовом — гонка исчезает, а число перерисовок падает.
 */
export class CoalescingMoveScheduler {
  private accumulatedDiff: number;
  private isRunning: boolean;
  private lastRunStartTime: number;
  private readonly handler: (accumulatedDiff: number, batch: CoalescedMoveBatch) => Promise<void>;
  private pendingInputCount: number;
  private pendingFirstInputAt: number;
  // Минимальный интервал (мс) между запусками обработчика. За время ожидания
  // продолжают копиться смещения, поэтому они схлопываются в один более крупный
  // шаг. 0 — без ограничения (запуски идут так часто, как успевает обработчик).
  private readonly minIntervalMs: number;

  constructor(handler: (accumulatedDiff: number, batch: CoalescedMoveBatch) => Promise<void>, minIntervalMs: number = 0) {
    this.handler = handler;
    this.accumulatedDiff = 0;
    this.isRunning = false;
    this.lastRunStartTime = 0;
    this.minIntervalMs = minIntervalMs;
    this.pendingInputCount = 0;
    this.pendingFirstInputAt = 0;
  }

  /** Добавить смещение и запустить обработку (если она ещё не идёт). */
  push(moveDiff: number): void {
    if (this.pendingInputCount === 0) {
      this.pendingFirstInputAt = performance.now();
    }
    ++this.pendingInputCount;
    this.accumulatedDiff += moveDiff;
    void this.drain();
  }

  /** Идёт ли обработка или есть необработанное накопленное смещение. */
  get isBusy(): boolean {
    return this.isRunning || this.accumulatedDiff !== 0;
  }

  private async drain(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      while (this.accumulatedDiff !== 0) {
        // Выдерживаем минимальный интервал между запусками. Ждём ДО захвата
        // накопленного смещения, чтобы за время паузы успели прийти ещё события
        // и слились в один вызов.
        if (this.minIntervalMs > 0) {
          const waitMs = this.minIntervalMs - (Date.now() - this.lastRunStartTime);
          if (waitMs > 0) {
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
        }
        const diff = this.accumulatedDiff;
        const batch: CoalescedMoveBatch = {
          firstInputAt: this.pendingFirstInputAt,
          inputCount: this.pendingInputCount,
          runStartedAt: performance.now()
        };
        this.accumulatedDiff = 0;
        this.pendingInputCount = 0;
        this.pendingFirstInputAt = 0;
        this.lastRunStartTime = Date.now();
        try {
          await this.handler(diff, batch);
        } catch (error) {
          console.error(`CoalescingMoveScheduler handler failed:`, error); // eslint-disable-line no-console
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

export type CoalescedMoveBatch = {
  firstInputAt: number;
  inputCount: number;
  runStartedAt: number;
};
