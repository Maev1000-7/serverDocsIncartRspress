import { JagmChartDataProvider, JagmPreparedDataProvider, JagmRawDataProvider } from "@incartdev/jagm-chart";
import { parsePreparedMarks } from "@/ts/marks/parse-prepared-marks";

export function createDataProvider(dataType: string): JagmChartDataProvider {
  switch (dataType) {
    case "raw":
      return new JagmRawDataProvider();
    case "prepared":
      return new JagmPreparedDataProvider(parsePreparedMarks);
  }
  return new JagmRawDataProvider();
}