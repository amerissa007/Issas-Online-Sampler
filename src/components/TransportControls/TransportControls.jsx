import React, { useRef } from "react";
import "./transportcontrols.css";

export default function TransportControls({ audioCtx, buffer, loopStart, loopEnd, onPlayhead }) {
  const sourceRef = useRef(null);
  const startAtRef = useRef(0);
  const rafRef = useRef(0);

  const loopLen = Math.max(0, (loopEnd ?? 0) - (loopStart ?? 0));

  const play = () => {
    if (!audioCtx || !buffer || loopLen <= 0) return;
    stop();

    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = loopStart;
    src.loopEnd = loopEnd;
    src.connect(audioCtx.destination);

    // start at loopStart
    src.start(0, loopStart);
    sourceRef.current = src;
    startAtRef.current = audioCtx.currentTime;

    const tick = () => {
      if (!sourceRef.current) return;
      const elapsed = (audioCtx.currentTime - startAtRef.current) % loopLen;
      const absolute = loopStart + elapsed;                
      const frac = absolute / buffer.duration;             
      onPlayhead(frac);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stop = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    onPlayhead(loopStart / (buffer?.duration || 1));
  };

  return (
    <div className="transport">
      <button onClick={play} disabled={!buffer}>▶ Play Loop</button>
      <button onClick={stop}>■ Stop</button>
    </div>
  );
}
