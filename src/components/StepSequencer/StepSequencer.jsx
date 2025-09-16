import { useEffect, useMemo, useRef, useState } from "react";
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
  slicePoints = [],
  stepSlices,
  setStepSlices,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  const timerRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const stepRef = useRef(0);

  const stepsRef = useRef(steps);
  const bpmRef = useRef(bpm);
  const stepSlicesRef = useRef(stepSlices);

  useEffect(() => { stepsRef.current = steps; }, [steps]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { stepSlicesRef.current = stepSlices; }, [stepSlices]);

  const segments = useMemo(() => {
    if (!buffer) return [];
    const pts = slicePoints.slice().sort((a,b)=>a-b).filter(t => t >= 0 && t < buffer.duration);
    if (pts.length === 0) return [{ start: 0, end: buffer.duration }];
    const segs = [];
    for (let i = 0; i < pts.length; i++) {
      const s = pts[i];
      const e = (i + 1 < pts.length) ? pts[i+1] : buffer.duration;
      if (e > s + 0.005) segs.push({ start: s, end: e });
    }
    return segs;
  }, [buffer, slicePoints]);

  const spb = () => 60 / Math.max(1, bpmRef.current);
  const stepDur = () => spb() / 4; // 16th

  const outNode = () =>
    (gainNode && audioCtx && gainNode.context === audioCtx) ? gainNode : (audioCtx?.destination ?? null);

  const mapLoopOneShot = () => {
    const len = Math.max(0.02, (loopEnd - loopStart) / Math.max(0.0001, rate));
    return { startOffset: reverse ? (buffer.duration - loopEnd) : loopStart, dur: len };
  };

  const mapSliceOneShot = (idx) => {
    const seg = segments[idx];
    if (!seg) return null;
    const len = Math.max(0.02, (seg.end - seg.start) / Math.max(0.0001, rate));
    const startOffset = reverse
      ? ((reversedBuffer?.duration ?? buffer.duration) - seg.end)
      : seg.start;
    return { startOffset, dur: len };
  };

  const scheduleNote = (iStep, when) => {
    if (!audioCtx || !buffer || !stepsRef.current[iStep]) return;
    const out = outNode(); if (!out) return;
    const useBuf = reverse ? reversedBuffer : buffer; if (!useBuf) return;

    const sliceIdx = stepSlicesRef.current[iStep];
    const mapping = (sliceIdx != null) ? mapSliceOneShot(sliceIdx) : mapLoopOneShot();
    if (!mapping) return;

    const src = audioCtx.createBufferSource();
    src.buffer = useBuf;
    src.playbackRate.value = rate;

    const gnode = audioCtx.createGain();
    src.connect(gnode).connect(out);

    const g = Math.max(0.02, Math.min(gate || stepDur() * 0.95, mapping.dur));
    try { audioCtx.resume(); } catch {}
    src.start(when, mapping.startOffset, g);
  };

  const scheduler = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const ahead = 0.06;

    while (nextNoteTimeRef.current < now + ahead) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);

      const showStep = stepRef.current;
      const delayMs = Math.max(0, (nextNoteTimeRef.current - now) * 1000 - 2);
      setTimeout(() => setActiveStep(showStep), delayMs);

      nextNoteTimeRef.current += stepDur();
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
    timerRef.current = setInterval(scheduler, 20);
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

  const toggleStep = (i) => setSteps(prev => prev.map((v,idx)=> idx===i ? !v : v));
  const cycleSlice = (i, dir=+1) => {
    setStepSlices(prev => {
      const N = segments.length; if (N === 0) return prev;
      const next = prev.slice();
      const cur = next[i];
      if (cur == null) next[i] = (dir > 0 ? 0 : N-1);
      else {
        let n = cur + dir;
        if (n >= N || n < 0) n = null;
        next[i] = n;
      }
      return next;
    });
  };
  const clearSlice = (i) => setStepSlices(prev => { const n = prev.slice(); n[i] = null; return n; });

  const clickCell = (e,i) => {
    if (e.altKey) return clearSlice(i);
    if (e.shiftKey) return cycleSlice(i,-1);
    toggleStep(i);
  };

  return (
    <div className="seq">
      <div className="seq-header">
        <h3>Step Sequencer</h3>
        <div className="seq-controls">
          <label>BPM</label>
          <input className="range" type="range" min="60" max="180" value={bpm} onChange={(e)=>setBpm(+e.target.value)} />
          <span className="value">{bpm}</span>
          <button onClick={start} disabled={!buffer || isPlaying}>▶ Play</button>
          <button onClick={stop} disabled={!isPlaying}>■ Stop</button>
        </div>
      </div>

      <div className="seq-grid">
        {Array.from({ length: 16 }).map((_, i) => {
          const on = steps[i];
          const isActive = i === activeStep && isPlaying;
          const sIdx = stepSlices[i];
          const label = sIdx != null ? String(sIdx + 1) : "—";
          return (
            <button
              key={i}
              className={
                "cell" +
                (on ? " on" : "") +
                (isActive ? " active" : "") +
                (sIdx != null ? " has-slice" : "")
              }
              onClick={(e)=>clickCell(e,i)}
              onContextMenu={(e)=>{ e.preventDefault(); cycleSlice(i,+1); }}
              title={`Step ${i+1} • Slice: ${sIdx!=null ? sIdx+1 : "none"}`}
            >
              <div className="cell-top">{label}</div>
              <div className="cell-bottom">{i+1}</div>
            </button>
          );
        })}
      </div>

      <p className="seq-hint">
        Click=toggle • <b>Right-click</b>=next slice • <b>Shift+Click</b>=prev slice • <b>Alt/⌥+Click</b>=clear slice.
      </p>
    </div>
  );
}
