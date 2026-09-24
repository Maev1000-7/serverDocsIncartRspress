import { VisScreenMark } from "@incartdev/ts-utils";

export class PreparedQrsMark extends VisScreenMark {
  HR: number;
  RR: number;
  Form: string;

  constructor(settings: {
    x: number;
    y: number;
    data: {
      HR: number;
      RR: number;
      Form: string;
    }
  }) {
    super({
      type: "QRS",
      x: settings.x,
      y: settings.y
    });
    this.HR = settings.data.HR;
    this.RR = settings.data.RR;
    this.Form = settings.data.Form;
  }
}