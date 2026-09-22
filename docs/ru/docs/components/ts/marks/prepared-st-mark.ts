import { VisScreenMark } from "@incartdev/ts-utils";

export class PreparedSTMark extends VisScreenMark {
  values: number[];

  constructor(settings: {
    x: number,
    y: number,
    data: {
      values: number[]
    }
  }) {
    super({
      type: "ST_ARRAY",
      x: settings.x,
      y: settings.y
    });
    this.values = settings.data.values;
  }
}