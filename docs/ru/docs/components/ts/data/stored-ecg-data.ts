// Same shape as StoredTrendData, so both records feed the generator the same way.
// Values are raw ECG samples in µV; the chart config scales them to mV.
export type StoredEcgData = {
  datakey: string,
  data: {
    _: number[]
  }
};
