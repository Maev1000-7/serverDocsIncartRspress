// Помощник для примеров ChartElements/Axis: комбобокс "Стрелка" переключает вид стрелки у осей,
// задавая поле settings.arrow элемента "axis" в настройках визуализатора. Делаем глубокую копию
// настроек (исходный импортированный JSON не мутируем) и проставляем arrow всем элементам axis.
export function withAxisArrow(visualizatorSettings: unknown, arrow: string): unknown {
  const clone: unknown = JSON.parse(JSON.stringify(visualizatorSettings));
  setAxisArrow(clone, arrow);
  return clone;
}

// Рекурсивно обходит настройки и на каждом объекте с name === "axis" выставляет settings.arrow.
function setAxisArrow(node: unknown, arrow: string): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      setAxisArrow(item, arrow);
    }
    return;
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (record.name === "axis" && record.settings !== null && typeof record.settings === "object") {
      (record.settings as Record<string, unknown>).arrow = arrow;
    }
    for (const value of Object.values(record)) {
      setAxisArrow(value, arrow);
    }
  }
}
