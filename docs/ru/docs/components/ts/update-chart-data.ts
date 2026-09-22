import { JagmRootProvider } from "@incartdev/jagm-core";
import { JagmChartDataProvider, JagmRawVisScreenDataCreator, JagmSignalsChartProvider } from "@incartdev/jagm-chart";

export function updateChartPanelWidth(
  channelName: string,
  chartDataProvider: JagmChartDataProvider,
  chartProvider: JagmSignalsChartProvider
): number {
  if (chartProvider === undefined) {
    return -1;
  }
  let width = -1;
  for (const signalGroup of chartProvider.signalObjectGroups) {
    const screenDataProvider = chartDataProvider.getScreen(signalGroup.createSettings.id);
    if (screenDataProvider === undefined) {
      continue;
    }
    const sourceDataProvider = screenDataProvider.getDataSource(0);
    if (sourceDataProvider === undefined) {
      continue;
    }
    const channelDataProvider = sourceDataProvider.getChannelByName(channelName);
    if (channelDataProvider === undefined) {
      continue;
    }
    width = screenDataProvider.getSignalsWidthInPoints(channelDataProvider.channelInfo.frequency);
  }
  return width;
}

export async function clearAllData(chartDataProvider: JagmChartDataProvider,
  chartProvider: JagmSignalsChartProvider
) {
  for (const signalGroup of chartProvider.signalObjectGroups) {
    await signalGroup.clearAllData();
  }
  await chartDataProvider.clearData();
}

export async function updateChartRawData(
  channelName: string,
  inputData: (number | null)[][],
  chartDataProvider: JagmChartDataProvider,
  chartProvider: JagmSignalsChartProvider,
  visProvider: JagmRootProvider
): Promise<void> {
  const chartPanelWidth = updateChartPanelWidth(channelName, chartDataProvider, chartProvider);
  if (chartPanelWidth < 0) {
    return;
  }
  await clearAllData(chartDataProvider, chartProvider);
  const signalDataList = inputData.map((signal: (number | null)[], index: number) => {
    return {
      value: `V${index}`,
      content: signal.slice(0, chartPanelWidth)
    };
  });
  if (signalDataList.length === 0) {
    return;
  }
  const chartData = JagmRawVisScreenDataCreator.createSplittedChannel({
    channel: channelName,
    signals: signalDataList.map(el => el.content)
  });
  await chartDataProvider.addData(chartData, 0, true);
  visProvider.refreshGraphics();
}