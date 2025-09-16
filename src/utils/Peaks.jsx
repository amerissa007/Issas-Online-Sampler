export function buildPeaks(buffer, targetWidth = 1000) {
  const chData = buffer.getChannelData(0);
  const total = chData.length;
  const width = Math.min(targetWidth, Math.max(100, Math.floor(total / 100)));
  const samplesPerBucket = Math.floor(total / width) || 1;

  const peaks = new Array(width);
  for (let x = 0; x < width; x++) {
    const start = x * samplesPerBucket;
    let min = 1, max = -1;
    for (let i = 0; i < samplesPerBucket; i++) {
      const v = chData[start + i] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[x] = [min, max];
  }
  return { peaks, width };
}
