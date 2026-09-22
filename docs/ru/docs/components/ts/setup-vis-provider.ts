import { JagmDataSource, JagmRootProvider } from "@incartdev/jagm-core";
import { JagmChartDataProvider, JagmSignalsChartProvider } from "@incartdev/jagm-chart";
import { StandardVisualizationBuilder } from "@incartdev/web-graphic-lib";
import { addChartResizeListener } from "./add-chart-resize-listener";
import { clearAllData } from "./update-chart-data";

export function createVisProvider(dataProvider: JagmDataSource): JagmRootProvider {
  return new JagmRootProvider(new StandardVisualizationBuilder(dataProvider), dataProvider);
}

export async function initOfflineVisProvider(inputData: {
  visProvider: JagmRootProvider;
  chartDataProvider: JagmChartDataProvider;
  canvasWrap: HTMLElement;
  visualizatorSettings: unknown;
  setDataFunc: (chartProvider: JagmSignalsChartProvider) => Promise<void>;
  onResizeFunc?: (chartProvider: JagmSignalsChartProvider) => Promise<void>;
  initFunc?: (chartProvider: JagmSignalsChartProvider) => Promise<void>;
  onDataProviderInitialized?: () => Promise<void>;
  channels?: string[];
}): Promise<JagmSignalsChartProvider> {
  if (inputData.onDataProviderInitialized !== undefined) {
    inputData.chartDataProvider.addEventListener("initialized", inputData.onDataProviderInitialized);
  }
  await inputData.visProvider.create({
    settings: inputData.visualizatorSettings,
    rootHtml: inputData.canvasWrap
  });
  const chartProvider = new JagmSignalsChartProvider(inputData.visProvider.builder.getRootObject());
  if (inputData.initFunc !== undefined) {
    await inputData.initFunc(chartProvider);
  }
  await inputData.setDataFunc(chartProvider);
  let onResizeFunc = async (cp: JagmSignalsChartProvider) => {
    await inputData.setDataFunc(cp);
  };
  if (inputData.onResizeFunc !== undefined) {
    onResizeFunc = inputData.onResizeFunc;
  }
  addChartResizeListener(inputData.visProvider, async () => await onResizeFunc(chartProvider));
  return chartProvider;
}

export async function initOnlineVisProvider(inputData: {
  visProvider: JagmRootProvider;
  chartDataProvider: JagmChartDataProvider;
  canvasWrap: HTMLElement;
  visualizatorSettings: unknown;
  channels?: string[];
  // Необязательный перезапуск генератора при СМЕНЕ МАСШТАБА (зум/системный scale). Нужен,
  // чтобы после пересборки состояния график начал заполняться с начала экрана: иначе
  // непрерывный генератор продолжает с текущей позиции — первый круг сигнала/меток идёт не
  // с левого края. Вызывается только при реальном изменении devicePixelRatio.
  onScaleChange?: () => Promise<void>;
}): Promise<JagmSignalsChartProvider> {
  await inputData.visProvider.create({
    settings: inputData.visualizatorSettings,
    rootHtml: inputData.canvasWrap
  });
  const chartProvider = new JagmSignalsChartProvider(inputData.visProvider.builder.getRootObject());
  // При смене масштаба (зум браузера/системы) буфер сигнала иначе остаётся со старым
  // deviceScale (setDeviceScale не переинициализирует его), и непрерывно подаваемые данные
  // пишутся в устаревшую геометрию: метки/leadRay расходятся с сигналом, а старый сигнал не
  // затирается (roll-заворот на старой ширине). clearAllData пересобирает модели сигнала под
  // новый ds (clearData→init) и чистит метки (через события SignalDataCleared), а непрерывный
  // генератор (живой ds) дозаполняет сигнал/метки/leadRay заново. Слушаем те же события, что и
  // офлайн: "CanvasSizeChanged" (чистый зум, без relayout) и "UpdateBorders" (ресайз окна).
  let lastDpr = window.devicePixelRatio;
  addChartResizeListener(inputData.visProvider, async () => {
    await clearAllData(inputData.chartDataProvider, chartProvider);
    // Перезапуск генератора — только при реальной смене масштаба (не на старте/ресайзе окна),
    // чтобы сигнал начал заполняться с левого края экрана (первый круг с метками).
    if ((window.devicePixelRatio !== lastDpr) && (inputData.onScaleChange !== undefined)) {
      lastDpr = window.devicePixelRatio;
      await inputData.onScaleChange();
    }
    inputData.visProvider.refreshGraphics();
  });
  return chartProvider;
}
