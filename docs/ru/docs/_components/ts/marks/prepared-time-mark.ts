import { VisScreenMark } from "@incartdev/ts-utils";

export class PreparedTimeMark extends VisScreenMark {
  time: string;

  constructor(settings: {
    x: number,
    y: number,
    data: {
      time: string
    }
  }) {
    super({
      type: "S_UTC_TIME",
      x: settings.x,
      y: settings.y
    });
    this.time = settings.data.time;
  }
}