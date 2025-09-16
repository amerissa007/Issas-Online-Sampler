import { useEffect, useRef, useState } from "react";
import "./stepsequencer.css";

export default function StepSequencer({
  audioCtx,
  buffer,
  reversedBuffer,   
  reverse,          
  loopStart,
  loopEnd,
  gainNode,         
  rate = 1,         
  bpm,
  setBpm,
  steps,
  setSteps,
  gate,             
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const timerRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const stepRef = useRef(0);

  const stepsRef = useRef(steps);
  const bpmRef = useRef(bpm);

  useEffect(() => { stepsRef.current = steps; }, [steps]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const lookaheadMs = 20;
  const scheduleAheadS = 0.06;

  const loopLen = Math.max(0, (loopEnd ?? 0) - (loopStart ?? 0));

  const getOutputNode = () => {
    if (gainNode && audioCtx && gainNode.context === audioCtx) return gainNode;
    return audioCtx?.destination ?? null;
  };

  const mapStartOffset = (useBuf) => {
    if (!reverse) return loopStart;
    return useBuf.duration - loopEnd;
  };

  // Schedules a single hit at time 'when'
  const scheduleNote = (stepIdx, when) => {
    if (!audioCtx || !buffer) return;
    if (!stepsRef.current[stepIdx]) return;

    const out = getOutputNode();
    if (!out) return;

    const useBuf = reverse ? reversedBuffer : buffer;
    if (!useBuf) return;

    const src = audioCtx.createBufferSource();
    src.buffer = useBuf;
    src.playbackRate.value = rate;

    const g = Math.max(0.02, Math.min(gate || 0.2, loopLen || gate || 0.2));

    src.connect(out);
    src.start(when, mapStartOffset(useBuf), g);
  };

  const nextStepTime = () => {
    const spb = 60 / Math.max(1, bpmRef.current);
    return nextNoteTimeRef.current + spb / 4; // 16th note
  };

  const scheduler = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    while (nextNoteTimeRef.current < now + scheduleAheadS) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);

      const showStep = stepRef.current;
      const delayMs = Math.max(0, (nextNoteTimeRef.current - now) * 1000 - 2);
      setTimeout(() => setActiveStep(showStep), delayMs);

      nextNoteTimeRef.current = nextStepTime();
      stepRef.current = (stepRef.current + 1) % 16;
    }
  };

  const start = async () => {
    if (!audioCtx || !buffer) return;
    try { await audioCtx.resume(); } catch {}
    if (isPlaying) return;

    setIsPlaying(true);
    stepRef.current = 0;
    nextNoteTimeRef.current = audioCtx.currentTime + 0.05;
    timerRef.current = setInterval(scheduler, lookaheadMs);
  };

  const stop = () => {
    if (!isPlaying) return;
    setIsPlaying(false);
    clearInterval(timerRef.current);
    timerRef.current = null;
    setActiveStep(-1);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const toggleStep = (i) => {
    setSteps(prev => {
      const next = prev.map((v, idx) => (idx === i ? !v : v));

      if (audioCtx && isPlaying && !prev[i] && buffer) {
        const out = getOutputNode();
        const useBuf = reverse ? reversedBuffer : buffer;
        if (out && useBuf) {
          const src = audioCtx.createBufferSource();
          src.buffer = useBuf;
          src.playbackRate.value = rate;
          const g = Math.max(0.02, Math.min(gate || 0.2, loopLen || gate || 0.2));
          src.connect(out);
          try { audioCtx.resume(); } catch {}
          src.start(audioCtx.currentTime + 0.02, mapStartOffset(useBuf), g);
        }
      }

      return next;
    });
  };

  return (
    <div className="seq">
      <div className="seq-header">
        <h3>Step Sequencer</h3>
        <div className="seq-controls">
          <label>BPM</label>
          <input
            type="range"
            min="60"
            max="180"
            value={bpm}
            onChange={(e) => setBpm(+e.target.value)}
          />
          <span className="value">{bpm}</span>
          <button onClick={start} disabled={!buffer || isPlaying}>▶ Play</button>
          <button onClick={stop} disabled={!isPlaying}>■ Stop</button>
        </div>
      </div>

      <div className="seq-grid">
        {Array.from({ length: 16 }).map((_, i) => {
          const on = steps[i];
          const isActive = i === activeStep && isPlaying;
          return (
            <button
              key={i}
              className={
                "cell" +
                (on ? " on" : "") +
                (isActive ? " active" : "")
              }
              onClick={() => toggleStep(i)}
              title={`Step ${i + 1}`}
            />
          );
        })}
      </div>

      <p className="seq-hint">
        Click cells to toggle notes. Steps & BPM update live; gate, pitch, and reverse apply to each hit.
      </p>
    </div>
  );
}
