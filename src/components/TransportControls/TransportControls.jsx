import { useEffect, useRef } from "react";
import "./transportcontrols.css";

export default function TransportControls({
  audioCtx,
  buffer,
  reversedBuffer,  
  reverse,         
  loopStart,
  loopEnd,
  gainNode,
  panNode,
  rate = 1,
  onPlayhead,
}) {
  const sourceRef = useRef(null);
  const rafRef = useRef(0);

  const posRef = useRef(0);
  const lastTimeRef = useRef(0);

  const loopLen = Math.max(0, (loopEnd ?? 0) - (loopStart ?? 0));

  const play = () => {
    if (!audioCtx || !buffer || loopLen <= 0 || !gainNode || !panNode) return;
    stop();

    const useBuf = reverse ? reversedBuffer : buffer;
    if (!useBuf) return;

    const startOffset = reverse
      ? (useBuf.duration - loopEnd)    
      : loopStart;
    const endOffset = reverse
      ? (useBuf.duration - loopStart)
      : loopEnd;

    const src = audioCtx.createBufferSource();
    src.buffer = useBuf;
    src.loop = true;
    src.loopStart = startOffset;
    src.loopEnd = endOffset;
    src.playbackRate.value = rate;

    src.connect(gainNode);
    src.start(0, startOffset);

    sourceRef.current = src;
    posRef.current = 0;
    lastTimeRef.current = audioCtx.currentTime;

    const tick = () => {
      if (!sourceRef.current) return;
      const now = audioCtx.currentTime;
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      const r = sourceRef.current.playbackRate.value || rate;

      posRef.current = (posRef.current + dt * r) % loopLen;

      const absolute = reverse
        ? (loopEnd - posRef.current)     
        : (loopStart + posRef.current);  

      const frac = absolute / buffer.duration;
      onPlayhead(frac);

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stop = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    if (buffer) {
      const frac = (reverse ? loopEnd : loopStart) / buffer.duration;
      onPlayhead(frac);
    }
  };

  useEffect(() => {
    if (audioCtx && sourceRef.current) {
      sourceRef.current.playbackRate.setValueAtTime(rate, audioCtx.currentTime);
    }
  }, [rate, audioCtx]);

  return (
    <div className="transport">
      <button onClick={play} disabled={!buffer}>▶ Play Loop</button>
      <button onClick={stop}>■ Stop</button>
    </div>
  );
}
