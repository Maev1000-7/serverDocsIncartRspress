import { isNumberArray, isRecord, VisScreenMark } from "@incartdev/ts-utils";
import { PreparedQrsMark } from "./prepared-qrs-mark";
import { PreparedSMark } from "./prepared-s-mark";
import { PreparedSTMark } from "./prepared-st-mark";
import { PreparedTimeMark } from "./prepared-time-mark";
import { PreparedValueMark } from "./prepared-value-mark";

export function parsePreparedMarks(markType: string, x: number, y: number, data: unknown): VisScreenMark | undefined {
  switch (markType) {
    // Position-only example marks (circle / line / complex): no data payload.
    case "Q":
    case "Spoint":
    // AveragedComplex example: complex-boundary line marks (start / end brackets).
    case "ComplexStart":
    case "ComplexEnd":
      return new VisScreenMark({ type: markType, x, y });
    // Text example mark: carries a numeric value to display.
    case "RR":
      return new PreparedValueMark({ type: markType, x, y, data });
    case "QRS":
      return parseQrsMark(x, y, data);
    case "SPOINT":
      return parseSMark(x, y, data);
    case "ST_ARRAY":
      return parseSTMark(x, y, data);
    case "S_UTC_TIME":
      return parseTimeMark(x, y, data);
  }
  return undefined;
}

function parseQrsMark(x: number, y: number, data: unknown): VisScreenMark {
  if (!isRecord(data)
    || !("HR" in data) || (typeof data.HR !== "number")
    || !("RR" in data) || (typeof data.RR !== "number")
    || !("Form" in data) || (typeof data.Form !== "string")
  ) {
    // Position-only QRS (e.g. the line-mark example): no HR/RR/Form payload.
    return new VisScreenMark({ type: "QRS", x, y });
  }
  return new PreparedQrsMark({
    x,
    y,
    data: {
      HR: data.HR,
      RR: data.RR,
      Form: data.Form
    }
  });
}


function parseSMark(x: number, y: number, data: unknown): VisScreenMark {
  if (!isRecord(data)
    || !("Width" in data) || (typeof data.Width !== "number")
  ) {
    throw new SyntaxError(`'data' for S mark has wrong type`);
  }
  return new PreparedSMark({
    x,
    y,
    data: {
      width: data.Width
    }
  });
}

function parseSTMark(x: number, y: number, data: unknown): VisScreenMark {
  if (!isRecord(data)
    || !("ST" in data) || !isNumberArray(data.ST)
  ) {
    throw new SyntaxError(`'data' for ST mark has wrong type`);
  }
  return new PreparedSTMark({
    x,
    y,
    data: {
      values: data.ST
    }
  });
}

function parseTimeMark(x: number, y: number, data: unknown): VisScreenMark {
  if (!isRecord(data)
    || !("time" in data) || (typeof data.time !== "string")
  ) {
    throw new SyntaxError(`'data' for time mark has wrong type`);
  }
  return new PreparedTimeMark({
    x,
    y,
    data: {
      time: data.time
    }
  });
}
