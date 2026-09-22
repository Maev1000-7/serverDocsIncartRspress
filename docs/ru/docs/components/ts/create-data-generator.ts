import { VisScreenChannelInfo } from "@incartdev/ts-utils";
import { JagmRootProvider } from "@incartdev/jagm-core";
import { JagmChartDataProvider, JagmPreparedDataProvider, JagmSignalsChartProvider } from "@incartdev/jagm-chart";
import {
  ContinuousPreparedSignalGenerator,
  ContinuousRawSignalGenerator,
  RequestPreparedSignalGenerator,
  RequestRawSignalGenerator,
  RequestSignalGenerator,
  SignalGenerator
} from "@incartdev/signal-generator-js";

export async function createContinuousDataGenerator(
  dataType: string,
  dataGeneratorSettings: unknown,
  visProvider: JagmRootProvider,
  chartDataProvider: JagmChartDataProvider
): Promise<SignalGenerator | undefined> {
  switch (dataType) {
    case "raw": {
      const generator = new ContinuousRawSignalGenerator();
      generator.init(dataGeneratorSettings);
      return generator;
    }
    case "prepared": {
      const chartProvider = new JagmSignalsChartProvider(visProvider.builder.getRootObject());
      if (chartProvider.signalObjectGroups.length === 0) {
        throw new ReferenceError(`chartProvider.signalObjectGroups is empty`);
      }
      const generator = new ContinuousPreparedSignalGenerator(chartDataProvider);
      generator.init(dataGeneratorSettings);
      const generatorChannels = await generator.getAvailableChannels();
      // One generator screen per signal group. With synchronizedScaleX=true there
      // is a single group (owning every channel) per content group, so this is the
      // original behaviour. With synchronizedScaleX=false there is one group per
      // channel, each on its own screen (own scaleX / roll), so we register a
      // generator screen per channel keyed by that group's screenId.
      for (const signalContentGroup of chartProvider.signalObjectGroups) {
        const signalPanelSize = signalContentGroup.getSignalsAreaSize();
        for (const signalGroup of signalContentGroup.signalGroups) {
          const scaleXSettings = signalGroup.getScaleX();
          if (scaleXSettings === undefined) {
            return undefined;
          }
          const screenId = signalGroup.screenId;
          const screenDataProvider = signalContentGroup.dataProvider.getScreen(screenId);
          if (screenDataProvider === undefined) {
            throw new ReferenceError(`screen data provider is undefined`);
          }
          screenDataProvider.setAvailableChannels(generatorChannels);
          const availableChannels = screenDataProvider.getAvailableChannels();
          const screenChannels: VisScreenChannelInfo[] = [];
          for (let channelIndex = 0; channelIndex < generatorChannels.length; ++channelIndex) {
            const channelName = generatorChannels[channelIndex].name;
            if (availableChannels.find(el => el.name === channelName) !== undefined) {
              const sourceDataProvider = screenDataProvider.dataSources[0];
              const channelDataProvider = sourceDataProvider.channels.find(el => el.channelInfo.name === channelName);
              if (channelDataProvider === undefined) {
                throw new ReferenceError(`channelDataProvider is undefined`);
              }
              const currVariantSettings = channelDataProvider.channelView.getSignalsVariant(
                channelDataProvider.channelInfo.currVariant
              );
              if (currVariantSettings === undefined) {
                throw new ReferenceError(`currVariantSettings is undefined`);
              }
              const signalInfoList = currVariantSettings.signals.map(el => {
                return {
                  id: el.id,
                  scaleY: el.scaleY?.getCurrValue() ?? 1
                };
              });
              screenChannels.push({
                id: channelIndex,
                signals: signalInfoList,
                marks: []
              });
            }
          }
          await generator.addScreen({
            id: screenId,
            width: signalPanelSize.width,
            height: signalPanelSize.height,
            scaleX: scaleXSettings.getCurrValue() ?? 1,
            canStart: true,
            ppmm: signalContentGroup.dataProvider.getPpmm(),
            dpix: signalContentGroup.dataProvider.getDpiX(),
            dpiy: signalContentGroup.dataProvider.getDpiY(),
            systemScale: signalContentGroup.dataProvider.getDeviceScale(),
            channels: screenChannels
          });
        }
      }
      if (!(chartDataProvider instanceof JagmPreparedDataProvider)) {
        throw new TypeError(`chartDataProvider is not JagmPreparedDataProvider`);
      }
      for (const screenDataProvider of chartDataProvider.screens) {
        chartDataProvider.setPreparedDataSource(generator, screenDataProvider.id);
      }
      return generator;
    }
  }
  return undefined;
}

// need invoke by event chartDataProvider "initialized"
export async function createRequestDataGenerator(
  dataType: string,
  dataGeneratorSettings: unknown,
  chartDataProvider: JagmChartDataProvider
): Promise<RequestSignalGenerator | undefined> {
  switch (dataType) {
    case "raw": {
      const generator = new RequestRawSignalGenerator();
      generator.init(dataGeneratorSettings);
      generator.addListener(chartDataProvider);
      return generator;
    }
    case "prepared": {
      const generator = new RequestPreparedSignalGenerator(chartDataProvider);
      generator.init(dataGeneratorSettings);
      generator.addListener(chartDataProvider);
      if (!(chartDataProvider instanceof JagmPreparedDataProvider)) {
        throw new TypeError(`chartDataProvider is not JagmPreparedDataProvider`);
      }
      // Генератор НЕ подключается здесь как источник prepared-данных: эта функция
      // вызывается по событию "initialized", то есть внутри visProvider.create, до
      // generator.addScreen (он в initRequestDataGenerator). Подключённый так рано
      // генератор ещё не имеет экранов, и создаваемые следом метки изолиний сразу
      // спрашивают getIsolineValue -> ReferenceError "can't find signal".
      // setPreparedDataSource делает initRequestDataGenerator уже после addScreen.
      return generator;
    }
  }
  return undefined;
}

// need invoke after visualizatorProvider.create
export async function initRequestDataGenerator(
  generator: RequestSignalGenerator,
  visProvider: JagmRootProvider,
  chartDataProvider: JagmChartDataProvider
): Promise<void> {
  if (generator instanceof RequestRawSignalGenerator) {
    const generatorChannels = await generator.getAvailableChannels();
    for (const screenDataProvider of chartDataProvider.screens) {
      screenDataProvider.setAvailableChannels(generatorChannels);
    }
  } else if (generator instanceof RequestPreparedSignalGenerator) {
    const chartProvider = new JagmSignalsChartProvider(visProvider.builder.getRootObject());
    if (chartProvider.signalObjectGroups.length === 0) {
      throw new ReferenceError(`signalObjectGroups is empty`);
    }
    if (!(chartDataProvider instanceof JagmPreparedDataProvider)) {
      throw new TypeError(`chartDataProvider is not JagmPreparedDataProvider`);
    }
    // One generator screen per signal group. A single-screen chart has one group, so
    // this matches the original behaviour. A split chart (Offline/SplitChart) declares
    // several `signals` content blocks — each its own screen with its own scaleX and
    // signals subset — so every group needs its own generator screen, otherwise the
    // extra screens (e.g. the right chart) stay empty.
    for (const signalContentGroup of chartProvider.signalObjectGroups) {
      const signalPanelSize = signalContentGroup.getSignalsAreaSize();
      for (const signalGroup of signalContentGroup.signalGroups) {
        const scaleXSettings = signalGroup.getScaleX();
        if (scaleXSettings === undefined) {
          throw new ReferenceError(`scale X settings is undefined`);
        }
        const firstSignalId = signalGroup.getFirstSignalId();
        if (firstSignalId === undefined) {
          throw new ReferenceError(`firstSignalId is undefined`);
        }
        const scaleYSettings = signalGroup.getScaleY(firstSignalId.channelId, firstSignalId.signalId);
        if (scaleYSettings === undefined) {
          throw new ReferenceError(`scale Y settings is undefined`);
        }
        const screenId = signalGroup.screenId;
        const sourceDataProvider = chartDataProvider.getDataSource(
          screenId,
          signalGroup.sourceInfo.id
        );
        if (sourceDataProvider === undefined) {
          throw new ReferenceError(`sourceDataProvider is undefined`);
        }
        const channelInfoList: VisScreenChannelInfo[] = sourceDataProvider.channels.map(el => {
          const currVariant = el.channelView.getSignalsVariant(el.channelInfo.currVariant);
          if (currVariant === undefined) {
            throw new ReferenceError(`currVariant is undefined`);
          }
          return {
            id: el.channelInfo.id,
            marks: [],
            signals: currVariant.signals.map(el => {
              return {
                id: el.id,
                scaleY: scaleYSettings.getCurrValue() ?? 1
              };
            })
          };
        });
        await generator.addScreen({
          id: screenId,
          width: signalPanelSize.width,
          height: signalPanelSize.height,
          scaleX: scaleXSettings.getCurrValue() ?? 1,
          canStart: false,
          ppmm: chartDataProvider.getPpmm(),
          dpix: chartDataProvider.getDpiX(),
          dpiy: chartDataProvider.getDpiY(),
          systemScale: chartDataProvider.getDeviceScale(),
          channels: channelInfoList
        });
      }
    }
    const generatorChannels = await generator.getAvailableChannels();
    for (const screenDataProvider of chartDataProvider.screens) {
      screenDataProvider.setAvailableChannels(generatorChannels);
      chartDataProvider.setPreparedDataSource(generator, screenDataProvider.id);
    }
  }
}
