import { VisScreenMark } from "@incartdev/ts-utils";

// A prepared mark that carries a display value (e.g. an RR text label). The chart's
// prepared mark provider reads `data` in parseEventMessage and passes it to the
// mark area's data converter.
export class PreparedValueMark extends VisScreenMark {
  data: unknown;

  constructor(settings: { type: string; x: number; y: number; data: unknown }) {
    super({ type: settings.type, x: settings.x, y: settings.y });
    this.data = settings.data;
  }
}
