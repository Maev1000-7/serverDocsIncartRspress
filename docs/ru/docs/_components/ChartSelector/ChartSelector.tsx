import { useEffect, useRef, useState } from "react";
import { SignalGenerator } from "@incartdev/signal-generator-js";

import lowFreqGeneratorSettings from "./generators/LowFreqGeneratorSettings.json";
import highFreqGeneratorSettings from "./generators/HighFreqGeneratorSettings.json";
import rollRegularVisSettings from "./visualizators/RollRegularVisualizatorSettings.json";
import scrollRegularVisSettings from "./visualizators/ScrollRegularVisualizatorSettings.json";
import rollColumnVisSettings from "./visualizators/RollColumnVisualizatorSettings.json";
import scrollColumnVisSettings from "./visualizators/ScrollColumnVisualizatorSettings.json";

import TextCombobox from "./TextCombobox";
import type {TextComboboxItem} from "./text-combobox-item";

import {
  createVisProvider,
  initOnlineVisProvider
} from "../ts/setup-vis-provider";
import { createContinuousDataGenerator } from "../ts/create-data-generator";
import { createDataProvider } from "../ts/create-data-provider";

import styles from "./ChartSelector.module.css";

// ---------------------------------------------------------------------------
// Статические списки опций
// ---------------------------------------------------------------------------
const dataTypeList: TextComboboxItem[] = [
  { id: "raw", text: "Raw" },
  { id: "prepared", text: "Prepared" }
];

const signalDrawModeList: TextComboboxItem[] = [
  { id: "roll", text: "Roll" },
  { id: "scroll", text: "Scroll" }
];

const lineDrawTypeList: TextComboboxItem[] = [
  { id: "regular", text: "Regular" },
  { id: "column", text: "Column" }
];

const isolineUpdateList: TextComboboxItem[] = [
  { id: "everyScreen", text: "Каждый экран" },
  { id: "everyData", text: "Каждую порцию данных" }
];

// ---------------------------------------------------------------------------
// Компонент
// ---------------------------------------------------------------------------
export default function ChartSelector() {
  // ---- Состояние селекторов -------------------------------------------------
  const [dataType, setDataType] = useState<TextComboboxItem>(dataTypeList[0]);
  const [signalDrawMode, setSignalDrawMode] = useState<TextComboboxItem>(
    signalDrawModeList[0]
  );
  const [lineDrawType, setLineDrawType] = useState<TextComboboxItem>(
    lineDrawTypeList[1] // в оригинале выбран "column"
  );
  const [isolineUpdate, setIsolineUpdate] = useState<TextComboboxItem>(
    isolineUpdateList[0]
  );

  // ---- Ref на DOM-контейнер -------------------------------------------------
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  // ---- Долгоживущие объекты (аналог module-level let в Vue) ----------------
  // Ленивая инициализация: useRef(...) не должен вызывать creator на каждом
  // рендере, поэтому проверяем `current` вручную.
  const chartDataProviderRef = useRef<ReturnType<
    typeof createDataProvider
  > | null>(null);
  const visProviderRef = useRef<ReturnType<typeof createVisProvider> | null>(
    null
  );
  const dataGeneratorRef = useRef<SignalGenerator | undefined>(undefined);
  const lastDataTypeRef = useRef<string>(dataTypeList[0].id);

  if (chartDataProviderRef.current === null) {
    chartDataProviderRef.current = createDataProvider(dataTypeList[0].id);
  }
  if (visProviderRef.current === null) {
    visProviderRef.current = createVisProvider(chartDataProviderRef.current);
  }

  // ---- Вспомогательные функции ---------------------------------------------
  const getDataGeneratorSettings = (): unknown => {
    switch (lineDrawType.id) {
      case "regular":
        return lowFreqGeneratorSettings;
      case "column":
        return highFreqGeneratorSettings;
    }
    return highFreqGeneratorSettings;
  };

  // Прописывает выбранный режим обновления изолинии в каждый сигнал конфига.
  // Импортированный JSON — общий объект, поэтому работаем на копии.
  const applyIsolineUpdate = (settings: unknown, value: string): unknown => {
    const clone: unknown = JSON.parse(JSON.stringify(settings));

    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node === null || typeof node !== "object") {
        return;
      }
      const record = node as Record<string, unknown>;
      const signals = record.signals;
      if (Array.isArray(signals)) {
        for (const signal of signals) {
          if (signal !== null && typeof signal === "object") {
            (signal as Record<string, unknown>).isolineUpdate = value;
          }
        }
      }
      for (const key of Object.keys(record)) {
        walk(record[key]);
      }
    };

    walk(clone);
    return clone;
  };

  const getBaseVisualizatorSettings = (): unknown => {
    switch (signalDrawMode.id) {
      case "roll": {
        switch (lineDrawType.id) {
          case "regular":
            return rollRegularVisSettings;
          case "column":
            return rollColumnVisSettings;
        }
        break;
      }
      case "scroll": {
        switch (lineDrawType.id) {
          case "regular":
            return scrollRegularVisSettings;
          case "column":
            return scrollColumnVisSettings;
        }
        break;
      }
    }
    return rollColumnVisSettings;
  };

  const getVisualizatorSettings = (): unknown =>
    applyIsolineUpdate(getBaseVisualizatorSettings(), isolineUpdate.id);

  const initOnlineChart = async (): Promise<void> => {
    if (
      canvasWrapRef.current === null ||
      chartDataProviderRef.current === null ||
      visProviderRef.current === null
    ) {
      return;
    }

    await initOnlineVisProvider({
      visProvider: visProviderRef.current,
      chartDataProvider: chartDataProviderRef.current,
      canvasWrap: canvasWrapRef.current,
      visualizatorSettings: getVisualizatorSettings()
    });

    dataGeneratorRef.current = await createContinuousDataGenerator(
      dataType.id,
      getDataGeneratorSettings(),
      visProviderRef.current,
      chartDataProviderRef.current
    );

    if (dataGeneratorRef.current === undefined) {
      return;
    }

    dataGeneratorRef.current.addListener(chartDataProviderRef.current);
    dataGeneratorRef.current.start();
  };

  const stopVisualization = async (): Promise<void> => {
    dataGeneratorRef.current?.stop();
    dataGeneratorRef.current = undefined;
    await visProviderRef.current?.clear();
  };

  const changeChart = async (): Promise<void> => {
    await stopVisualization();

    if (lastDataTypeRef.current !== dataType.id) {
      chartDataProviderRef.current = createDataProvider(dataType.id);
      visProviderRef.current = createVisProvider(chartDataProviderRef.current);
      lastDataTypeRef.current = dataType.id;
    }

    await initOnlineChart();
  };

  // ---- Эффекты --------------------------------------------------------------
  // Монтирование/размонтирование (замена onMounted / onBeforeUnmount).
  // nextTick не нужен: эффект уже выполняется после коммита DOM и refs заполнены.
  useEffect(() => {
    void initOnlineChart();
    return () => {
      void stopVisualization();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Реакция на изменение любого из селекторов.
  // Пропускаем первый рендер, чтобы не дублировать инициализацию из mount-эффекта.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    void changeChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataType, signalDrawMode, lineDrawType, isolineUpdate]);

  // ---- Разметка -------------------------------------------------------------
  return (
    <>
      <div className={styles.chartSelector}>
        <label className={`ml-2 mr-2 ${styles.chartSelectorLabel}`}>
          Тип данных:
        </label>
        <TextCombobox
          value={dataType}
          values={dataTypeList}
          width={100}
          onChange={setDataType}
        />
        <label className={`ml-5 mr-2 ${styles.chartSelectorLabel}`}>
          Развертка сигнала:
        </label>
        <TextCombobox
          value={signalDrawMode}
          values={signalDrawModeList}
          width={100}
          onChange={setSignalDrawMode}
        />
        <label className={`ml-5 mr-2 ${styles.chartSelectorLabel}`}>
          Отрисовка линий:
        </label>
        <TextCombobox
          value={lineDrawType}
          values={lineDrawTypeList}
          width={100}
          onChange={setLineDrawType}
        />
      </div>

      <div className={styles.chartSelector}>
        <label className={`ml-2 mr-2 ${styles.chartSelectorLabel}`}>
          Обновление изолинии:
        </label>
        <TextCombobox
          value={isolineUpdate}
          values={isolineUpdateList}
          width={180}
          onChange={setIsolineUpdate}
        />
      </div>

      <div ref={canvasWrapRef} className={styles.canvasWrap} />
    </>
  );
}