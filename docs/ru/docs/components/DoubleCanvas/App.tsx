import { useEffect, useRef, type FC } from "react";
import { JagmRawDataProvider } from "@incartdev/jagm-chart";
import { createVisProvider } from "../ts/setup-vis-provider";
import visualizatorSettings from "./VisualizatorSettings.json";
import styles from "./style.module.css";

export const Visualizator: FC = () => {
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const chartDataProvider = useRef(new JagmRawDataProvider());
  
  const visProvider = useRef(createVisProvider(chartDataProvider.current));
  
  useEffect(() => {
    let cancelled = false;

    async function install(): Promise<void> {
      // В React DOM уже отрисован к моменту useEffect, но оставим
      // асинхронную функцию для сохранения логики
      await Promise.resolve();
      if (cancelled) return;

      const rootHtml = canvasWrapRef.current;
      if (rootHtml === null) {
        return;
      }

      // Проинициализировать библиотеку конфигурацией и запустить её
      await visProvider.current.create({
        settings: visualizatorSettings,
        rootHtml,
      });
    }

    install();

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={canvasWrapRef} className={styles.canvasWrap} />;
};
