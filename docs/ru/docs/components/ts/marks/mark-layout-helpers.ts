// In "none" layout, item-positioned marks (circle / line) are anchored this many
// px below the chart's top border so they sit at the top instead of the config
// default (bottom). Text marks are positioned by their own top-anchored area, so
// this doesn't apply to them.
const NONE_TOP_OFFSET_PX = 20;

// Deep-clones visualizator settings and forces every mark's yLayout to the
// selected value. This lets a single set of config files (Roll/Scroll ×
// Regular/Column) serve every yLayout choice (none / signalPoint / isoline).
// Text marks additionally need their area sized per choice: none keeps the top
// strip, while signalPoint/isoline need the full height to reach the signal or
// isoline, so the area height is switched accordingly.
export function applyYLayout(settings: unknown, yLayout: string): unknown {
  const clone = structuredClone(settings);
  applyYLayoutToMarks(clone, yLayout);
  return clone;
}

function applyYLayoutToMarks(node: unknown, yLayout: string): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      applyYLayoutToMarks(item, yLayout);
    }
    return;
  }
  if (node === null || typeof node !== "object") {
    return;
  }
  const record = node as Record<string, unknown>;
  if (record.name === "marks" && Array.isArray(record.settings)) {
    for (const entry of record.settings) {
      applyYLayoutToMarkSetting(entry, yLayout);
    }
  }
  for (const key of Object.keys(record)) {
    applyYLayoutToMarks(record[key], yLayout);
  }
}

function applyYLayoutToMarkSetting(entry: unknown, yLayout: string): void {
  if (entry === null || typeof entry !== "object") {
    return;
  }
  const record = entry as Record<string, unknown>;
  // A "text-border" mark is a text label plus a full-height line; for layout purposes
  // (area sizing, centering, the "none" handling) it behaves exactly like a text mark.
  const isTextLike = record.type === "text" || record.type === "text-border";
  if (record.item !== null && typeof record.item === "object") {
    const item = record.item as Record<string, unknown>;
    item.yLayout = yLayout;
    // Text labels should begin at the mark point (line mark / circle-mark center),
    // extending to the right — not be centered on it. Turn off horizontal centering.
    if (isTextLike) {
      item.isCentered = false;
    }
    // In "none" layout the mark's y comes straight from its config, which pins
    // circle / line marks to the bottom. Switch them to a top-down axis: with a
    // top-anchored (y = 0) box of NONE_TOP_OFFSET_PX height, the rendered mark
    // ends up NONE_TOP_OFFSET_PX below the top border (a circle's center sits at
    // y + height), panel-height independent. Text marks are anchored by their
    // own area (handled below), so they're untouched.
    if (yLayout === "none" && !isTextLike) {
      item.axisY = "fromTopToBottom";
      item.height = `${NONE_TOP_OFFSET_PX}px`;
      item.y = "0px";
    }
  }
  // Text marks live in a bounded area. For "none" a top strip (y = 20px, height =
  // 20px) is what we want. For signalPoint / isoline the label is positioned by an
  // absolute signal/isoline coordinate that is relative to the signals panel, so the
  // area must coincide with that panel (y = 0, full height) — otherwise the 20px top
  // offset pushes every label that much below the signal.
  if (isTextLike && record.area !== null && typeof record.area === "object") {
    const area = record.area as Record<string, unknown>;
    if (yLayout === "none") {
      area.y = "20px";
      area.height = "20px";
    } else {
      area.y = "0px";
      delete area.height;
    }
  }
}
