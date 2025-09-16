import { encodeWavFromAudioBuffer } from "./EncodeWav";

export async function renderLoopToWav({
  ctxLike,            
  buffer,             
  reversedBuffer,     
  reverse = false,
  loopStart = 0,
  loopEnd = 0,
  rate = 1,

  filterCutoff = 12000,   
  filterQ = 0.7,
  delayTime = 0.25,       
  delayFeedback = 0.25,   
  delayMix = 0.25,        
  volume = 0.9,           
  pan = 0,                

  sampleRate = 44100,     
}) {
  if (!buffer) throw new Error("No buffer");
  const loopLen = Math.max(0, loopEnd - loopStart);
  if (!(loopLen > 0)) throw new Error("Invalid loop length");

  const useBuf = reverse ? reversedBuffer : buffer;
  if (!useBuf) throw new Error("Missing reversed buffer");

  const startOffset = reverse ? (useBuf.duration - loopEnd) : loopStart;
  const durationSec = loopLen / Math.max(0.0001, rate);

  const sr = sampleRate || ctxLike?.sampleRate || 44100;
  const ch = Math.min(2, useBuf.numberOfChannels);
  const frames = Math.ceil((durationSec + 0.05) * sr);
  const oac = new OfflineAudioContext(ch, frames, sr);

  const src = oac.createBufferSource();
  src.buffer = useBuf;
  src.playbackRate.value = rate;

  const filter = oac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.max(20, Math.min(20000, filterCutoff));
  filter.Q.value = Math.max(0.0001, filterQ);

  const dry = oac.createGain();
  const wet = oac.createGain();
  const delay = oac.createDelay(5.0);
  const fb = oac.createGain();

  const g = oac.createGain();
  g.gain.value = volume;

  const p = oac.createStereoPanner();
  p.pan.value = pan;

  src.connect(filter);

  filter.connect(dry);
  filter.connect(delay);

  delay.delayTime.value = Math.max(0, Math.min(5, delayTime));
  fb.gain.value = Math.max(0, Math.min(0.95, delayFeedback));
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);

  const wetAmt = Math.max(0, Math.min(1, delayMix));
  wet.gain.value = wetAmt;
  dry.gain.value = 1 - wetAmt;

  dry.connect(g);
  wet.connect(g);
  g.connect(p);
  p.connect(oac.destination);

  src.start(0, startOffset);

  const rendered = await oac.startRendering();
  return encodeWavFromAudioBuffer(rendered);
}

export function downloadBlob(blob, filename = "loop.wav") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}
