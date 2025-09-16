import { useEffect, useMemo, useRef, useState } from "react";
import "./padgrid.css";

export default function PadGrid({
  audioCtx,
  buffer,
  reversedBuffer,
  reverse,
  loopStart,
  loopEnd,
  rate = 1,
  gainNode,             
  slicePoints = [],
  setLoopStart,
  setLoopEnd,
}) {
  const [snapToSlice, setSnapToSlice] = useState(true);
  const [limitToLoop, setLimitToLoop] = useState(false);
  const [heldPads, setHeldPads] = useState(new Set());

  const activeRef = useRef({});
  const downKeysRef = useRef(new Set());

  const KEY_ORDER = useRef([
    "1","2","3","4","5","6","7","8","9","0","-","=",
    "q","w","e","r","t","y","u","i","o","p","[","]",
    "a","s","d","f","g","h","j","k","l",";","'",
    "z","x","c","v","b","n","m",",",".","/"
  ]).current;

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

    if (!limitToLoop) return segs;

    const A = loopStart ?? 0;
    const B = loopEnd ?? buffer.duration;
    if (!(B > A)) return [];
    return segs
      .map(seg => ({ start: Math.max(seg.start, A), end: Math.min(seg.end, B) }))
      .filter(seg => seg.end > seg.start + 0.005);
  }, [buffer, slicePoints, limitToLoop, loopStart, loopEnd]);

  const keyLabels = useMemo(() => segments.map((_, i) => KEY_ORDER[i] || ""), [segments, KEY_ORDER]);

  const getOut = () => {
    if (!audioCtx) return null;
    if (gainNode && gainNode.context === audioCtx) return gainNode;
    return audioCtx.destination;
  };

  const startPad = (idx) => {
    if (!audioCtx || !buffer || !segments[idx]) return;
    const out = getOut();
    const useBuf = reverse ? reversedBuffer : buffer;
    if (!out || !useBuf) return;

    stopPad(idx);

    const seg = segments[idx];
    const startOffset = reverse ? (useBuf.duration - seg.end) : seg.start;

    const src = audioCtx.createBufferSource();
    src.buffer = useBuf;
    src.playbackRate.value = rate;

    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0, now);
    g.gain.linearRampToValueAtTime(1.0, now + 0.01);

    src.connect(g).connect(out);
    try { audioCtx.resume(); } catch {}
    src.start(now, startOffset);

    activeRef.current[idx] = { src, gain: g };
    setHeldPads(prev => new Set(prev).add(idx));

    if (snapToSlice) {
      setLoopStart?.(seg.start);
      setLoopEnd?.(seg.end);
    }
  };

  const stopPad = (idx) => {
    const act = activeRef.current[idx];
    if (!act || !audioCtx) return;

    const { src, gain } = act;
    const now = audioCtx.currentTime;
    const release = 0.05;

    try {
      const cur = gain.gain.value;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(cur, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + release);
      src.stop(now + release + 0.005);
    } catch {}
    try { src.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    delete activeRef.current[idx];

    setHeldPads(prev => { const n = new Set(prev); n.delete(idx); return n; });
  };

  const stopAll = () => {
    Object.keys(activeRef.current).forEach(k => stopPad(+k));
    downKeysRef.current.clear();
  };

  const md = (e,i)=>{ e.preventDefault(); startPad(i); };
  const mu = (e,i)=>{ e.preventDefault(); stopPad(i); };
  const ml = (e,i)=>{ e.preventDefault(); stopPad(i); };
  const ts = (e,i)=>{ e.preventDefault(); startPad(i); };
  const te = (e,i)=>{ e.preventDefault(); stopPad(i); };
  const tc = (e,i)=>{ e.preventDefault(); stopPad(i); };

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key?.toLowerCase(); if (!key) return;
      const idx = keyLabels.findIndex(k => k === key);
      if (idx < 0) return;
      if (downKeysRef.current.has(key)) return;
      downKeysRef.current.add(key);
      e.preventDefault();
      startPad(idx);
    };
    const onKeyUp = (e) => {
      const key = e.key?.toLowerCase(); if (!key) return;
      const idx = keyLabels.findIndex(k => k === key);
      if (idx < 0) return;
      downKeysRef.current.delete(key);
      e.preventDefault();
      stopPad(idx);
    };
    const onBlurOrHide = () => stopAll();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlurOrHide);
    document.addEventListener("visibilitychange", onBlurOrHide);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlurOrHide);
      document.removeEventListener("visibilitychange", onBlurOrHide);
    };
  }, [keyLabels]);

  return (
    <div className="padgrid" onMouseLeave={stopAll} onTouchCancel={stopAll}>
      <div className="padgrid-header">
        <h3>Slices</h3>
        <div className="controls">
          <label className="toggle">
            <input type="checkbox" checked={snapToSlice} onChange={(e)=>setSnapToSlice(e.target.checked)} />
            Snap loop to slice
          </label>
          <label className="toggle">
            <input type="checkbox" checked={limitToLoop} onChange={(e)=>setLimitToLoop(e.target.checked)} />
            Limit to loop
          </label>
          <span className="count">{segments.length} slice(s)</span>
        </div>
      </div>

      {!buffer || segments.length === 0 ? (
        <div className="padgrid-empty">
          Add slice markers (Alt/⌥-click waveform), then hold pads/keys to audition.
        </div>
      ) : (
        <div className="pads" style={{ gridTemplateColumns: `repeat(${Math.min(segments.length, 8)}, 1fr)` }}>
          {segments.map((_, i) => (
            <button
              key={i}
              className={"pad" + (heldPads.has(i) ? " held" : "")}
              onMouseDown={(e) => md(e, i)}
              onMouseUp={(e) => mu(e, i)}
              onMouseLeave={(e) => ml(e, i)}
              onTouchStart={(e) => ts(e, i)}
              onTouchEnd={(e) => te(e, i)}
              onTouchCancel={(e) => tc(e, i)}
              title={`Slice ${i + 1}`}
            >
              <div className="pad-line1">{i + 1}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
