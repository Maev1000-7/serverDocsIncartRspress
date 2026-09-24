import { StoredEcgData } from "./stored-ecg-data";

// ECG_12.json is a bare array of signals, each a flat array of raw µV samples of equal
// length. ECG_3.json has the same shape but its three signals are identical copies, so
// this one is used instead: its leads actually differ.
const ECG_DATA_URL = "/data/ECG_12.json";

// Samples are fed to the generator in the unit the chart's scaleY is expressed in, because
// nothing converts between the two: for prepared data the generator turns a value into
// pixels itself (value · ppmm · scaleY) and the channel's `units.scale` from the view
// config never reaches it — that field only labels isolines. The ECG chart is scaled in
// mm/mV, as an ECG normally is, so µV samples are converted to mV here.
const MICROVOLTS_PER_MILLIVOLT = 1000;

// The recording is a few seconds long but the trend spans hours, so the ECG is played as
// an endless loop (see GenDataSignalSettings.loop). A loop is only seamless if the last
// sample continues into the first one, which an arbitrary cut does not: searching for a
// better cut is what findLoopLength does. Never search below this fraction of the file,
// or a very short period would win on smoothness alone and the ECG would visibly repeat.
const MIN_LOOP_FRACTION = 0.5;

// How much a slope mismatch at the seam counts relative to a value mismatch. A seam can
// line up in value yet still kink if the signal arrives going the other way, and a kink
// reads as an artefact on an ECG, so slope is weighted above value here.
const SLOPE_WEIGHT = 4;

export type EcgRecord = {
  signals: StoredEcgData[];
  // Number of points of one loop period: signals are already cut to it.
  loopLength: number;
};

/**
 * Length to cut the signals to so that looping them is seamless: the cut minimising the
 * step in value and slope between the last sample and the first, across all signals at
 * once (they share one cut, since they are one recording).
 */
export function findLoopLength(signals: number[][]): number {
  const pointCount = signals.reduce((min, signal) => Math.min(min, signal.length), Number.POSITIVE_INFINITY);
  if (!Number.isFinite(pointCount) || pointCount < 4) {
    return Number.isFinite(pointCount) ? pointCount : 0;
  }
  const minLength = Math.max(4, Math.floor(pointCount * MIN_LOOP_FRACTION));
  let bestLength = pointCount;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let length = minLength; length <= pointCount; ++length) {
    let cost = 0;
    for (const signal of signals) {
      const valueGap = signal[length - 1] - signal[0];
      const slopeGap = (signal[length - 1] - signal[length - 2]) - (signal[1] - signal[0]);
      cost += valueGap * valueGap + SLOPE_WEIGHT * slopeGap * slopeGap;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestLength = length;
    }
  }
  return bestLength;
}

/** Loads the first `signalCount` leads of the ECG file, cut to a seamless loop period. */
export async function loadEcgChartData(signalCount: number): Promise<EcgRecord> {
  const response = await fetch(ECG_DATA_URL);
  if (!response.ok) {
    throw new Error(`can't load '${ECG_DATA_URL}': ${response.status}`);
  }
  const fileData: unknown = await response.json();
  if (!Array.isArray(fileData)) {
    throw new TypeError(`'${ECG_DATA_URL}' is not an array of signals`);
  }
  const rawSignals = fileData.slice(0, signalCount);
  if (rawSignals.length < signalCount) {
    throw new RangeError(`'${ECG_DATA_URL}' has ${rawSignals.length} signals, ${signalCount} requested`);
  }
  for (const signal of rawSignals) {
    // The generator's settings parser rejects a data array holding anything but numbers,
    // so a file with gaps (ECG_3.json has them) would fail here rather than midway.
    if (!Array.isArray(signal) || signal.some(el => typeof el !== "number")) {
      throw new TypeError(`'${ECG_DATA_URL}' has a signal that is not an array of numbers`);
    }
  }
  const signals = rawSignals as number[][];
  const loopLength = findLoopLength(signals);
  return {
    loopLength,
    signals: signals.map((signal, signalIndex) => ({
      datakey: `ecg${signalIndex}`,
      data: {
        _: signal.slice(0, loopLength).map(value => value / MICROVOLTS_PER_MILLIVOLT)
      }
    }))
  };
}
