import { VisScreenMark } from "@incartdev/ts-utils";

export class PreparedSMark extends VisScreenMark {
  width: number;

  constructor(settings: {
    x: number,
    y: number,
    data: {
      width: number
    }
  }) {
    super({
      type: "SPOINT",
      x: settings.x,
      y: settings.y
    });
    this.width = settings.data.width;
  }
}