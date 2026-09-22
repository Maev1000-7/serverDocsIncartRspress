import { ScaleConfig } from "@incartdev/jagm-chart";

// Общие форматтеры подписей масштаба для примеров с кнопками изменения масштаба.
// Держим их в одном месте, чтобы формат был одинаковым во всех примерах
// (ChartSettingsButton.vue, ChartElements/Scales/*, Offline/TrendChart и т.д.).

// Масштаб X: "50 мм/с" (единицы из конфига scaleX, по умолчанию — "мм/с").
export function formatScaleX(scaleConfig: ScaleConfig | undefined): string {
  const currValue = scaleConfig?.getCurrValue();
  if (scaleConfig === undefined || currValue === undefined) {
    return "";
  }
  // currValue тренда пересчитывается в рантайме и может быть дробным — округляем.
  const rounded = Math.round(currValue * 100) / 100;
  if (scaleConfig.distanceUnit !== "" && scaleConfig.valueUnit !== "") {
    return `${rounded} ${scaleConfig.distanceUnit}/${scaleConfig.valueUnit}`;
  }
  return `${rounded} мм/с`;
}

// Масштаб Y: "1мВ - 10мм" (1 <единица значения> — <масштаб><единица расстояния>).
// Если единица значения не задана — показываем только число.
export function formatScaleY(scaleConfig: ScaleConfig | undefined): string {
  const currValue = scaleConfig?.getCurrValue();
  if (scaleConfig === undefined || currValue === undefined) {
    return "";
  }
  const rounded = Math.round(currValue * 100) / 100;
  const distanceUnit = scaleConfig.distanceUnit === "" ? "мм" : scaleConfig.distanceUnit;
  if (scaleConfig.valueUnit !== "") {
    return `1${scaleConfig.valueUnit} - ${rounded}${distanceUnit}`;
  }
  return `${rounded}`;
}
