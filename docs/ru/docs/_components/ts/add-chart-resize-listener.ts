import { JagmRootProvider } from "@incartdev/jagm-core";

// Повторная подача данных офлайн-графика при ресайзе должна происходить ПОСЛЕ того,
// как библиотека пересчитала границы панелей. При изменении размера окна layout панели
// сигналов пересобирается (updateSignalPanelSize -> init), что СБРАСЫВАЕТ модель данных
// сигнала. Событие "CanvasSizeChanged" срабатывает до этого пересчёта, поэтому подача
// данных на нём стирается последующим пересчётом — сигналы пропадают и не появляются
// (онлайн-примеры выживают только за счёт непрерывной подачи каждый кадр).
//
// Событие "UpdateBorders" (jagm-object.ts: updateBorders -> createBorders -> handleEvent)
// испускается ПОСЛЕ пересчёта границ, когда панель уже имеет новый размер, а модель данных
// очищена. Подача данных на нём попадает последним действием и с корректной шириной панели.
// Именно так работают примеры Measurer (chart.addEventListener("UpdateBorders", ...)).
//
// Дополнительно слушаем "CanvasSizeChanged" — это единственное событие при ЧИСТОЙ смене
// масштаба (зум браузера / системный scale): CSS-размеры панели не меняются, layout не
// пересобирается, поэтому "UpdateBorders" не летит, и без переподачи буфер столбцов остаётся
// с drawX/screenWidth от старого deviceScale, а снап идёт по новому → микроразрывы до
// перезагрузки. JagmCanvas.onResize обновляет deviceScale ДО диспатча "CanvasSizeChanged",
// поэтому переподача (clearData -> init) уже строит буфер под новый масштаб. При ресайзе окна
// "CanvasSizeChanged" приходит до wipe и его подача стирается пересчётом границ, но следом
// приходит "UpdateBorders" и переподаёт корректно, так что двойной листенер безопасен.
export function addChartResizeListener(visProvider: JagmRootProvider, onResizeFunc: () => Promise<void>): void {
  let isRunning = false;
  let rerunRequested = false;

  // Пересчёт границ/размера может прийти пачкой; не запускаем параллельные подачи, но после
  // текущей делаем ещё один прогон, чтобы взять самую актуальную ширину панели и масштаб.
  const runRefeed = async (): Promise<void> => {
    if (isRunning) {
      rerunRequested = true;
      return;
    }
    isRunning = true;
    try {
      do {
        rerunRequested = false;
        await onResizeFunc();
      } while (rerunRequested);
    } finally {
      isRunning = false;
    }
  };

  visProvider.rootObject?.addEventListener("UpdateBorders", runRefeed);
  visProvider.rootObject?.addEventListener("CanvasSizeChanged", runRefeed);
}
