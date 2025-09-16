import { encodeWavFromAudioBuffer } from "./EncodeWav";

export async function renderPatternToWav({
  ctxLike,
  buffer,
  reversedBuffer,
  reverse = false,
  loopStart = 0,
  loopEnd = 0,
  steps = Array(16).fill(false),

  bpm = 120,
  bars = 2,

  rate = 1,
  gate = 0.20,          

  filterCutoff = 12000,
  filterQ = 0.7,
  delayTime = 0.25,
  delayFeedback = 0.25,
  delayMix = 0.25,
  volume = 0.9,
  pan = 0,

  sampleRate = 44100,
}) {
  if (!buffer) throw new Error("No buffer loaded");
  const loopLen = Math.max(0, loopEnd - loopStart);
  if (!(loopLen > 0)) throw new Error("Invalid loop region");

  const useBuf = reverse ? reversedBuffer : buffer;
  if (!useBuf) throw new Error("Missing reversed buffer");

  const startOffset = reverse ? (useBuf.duration - loopEnd) : loopStart;

  const spb = 60 / Math.max(1, bpm);
  const stepDur = spb / 4; // 16th
  const totalBeats = 4 * bars;
  const totalTime = totalBeats * spb;

  const sr = sampleRate || ctxLike?.sampleRate || 44100;
  const ch = Math.min(2, useBuf.numberOfChannels);
  const frames = Math.ceil((totalTime + 0.25) * sr); // small tail for delays
  const oac = new OfflineAudioContext(ch, frames, sr);

  const filter = oac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.max(20, Math.min(20000, filterCutoff));
  filter.Q.value = Math.max(0.0001, filterQ);

  const dry = oac.createGain();
  const wet = oac.createGain();
  const delay = oac.createDelay(5.0);
  const fb = oac.createGain();

  const g = oac.createGain(); g.gain.value = volume;
  const p = oac.createStereoPanner(); p.pan.value = pan;

  delay.delayTime.value = Math.max(0, Math.min(5, delayTime));
  fb.gain.value = Math.max(0, Math.min(0.95, delayFeedback));
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);

  const wetAmt = Math.max(0, Math.min(1, delayMix));
  wet.gain.value = wetAmt;
  dry.gain.value = 1 - wetAmt;

  filter.connect(dry);
  filter.connect(delay);
  dry.connect(g);
  wet.connect(g);
  g.connect(p);
  p.connect(oac.destination);

  const gateSec = Math.max(0.02, Math.min(stepDur * 0.95, gate));
  const oneShotDur = gateSec / Math.max(0.0001, rate);

  const totalSteps = 16 * bars;
  for (let i = 0; i < totalSteps; i++) {
    if (!steps[i % 16]) continue;

    const when = i * stepDur;

    const src = oac.createBufferSource();
    src.buffer = useBuf;
    src.playbackRate.value = rate;

    src.connect(filter);

    src.start(when, startOffset, oneShotDur);
  }

  const rendered = await oac.startRendering();
  return encodeWavFromAudioBuffer(rendered);
}
