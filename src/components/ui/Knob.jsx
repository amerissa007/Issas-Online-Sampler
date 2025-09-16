import { useEffect, useMemo, useRef, useState } from "react";
import "./knob.css";

/**
 * Knob
 * Props:
 *  value, min, max, step, onChange(v)
 *  label (string)
 *  size (px) default 68
 *  format(v)=>string (value text)
 *  defaultValue (double-click to reset)
 */
export default function Knob({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  label = "",
  size = 68,
  format = (v) => String(v),
  defaultValue,
}) {
  const wrapRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, v: value });
  const [dragging, setDragging] = useState(false);

  // sweep from -135° to +135° (270°)
  const aMin = -135;
  const aMax = 135;

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const quantize = (n, s) => (s > 0 ? Math.round(n / s) * s : n);

  // value -> angle
  const angle = useMemo(() => {
    const t = (value - min) / (max - min || 1);
    return aMin + t * (aMax - aMin);
  }, [value, min, max]);

  // begin drag
  const onPointerDown = (e) => {
    e.preventDefault();
    const p = "touches" in e ? e.touches[0] : e;
    startRef.current = { x: p.clientX, y: p.clientY, v: value };
    setDragging(true);
  };

  // during drag
  const move = (clientX, clientY, fine) => {
    const dy = startRef.current.y - clientY; // up increases
    const dx = clientX - startRef.current.x; // small horizontal help
    const pixelsPerRange = fine ? 420 : 220; // larger => finer
    const delta = ((dy + dx * 0.25) / pixelsPerRange) * (max - min);
    let next = startRef.current.v + delta;
    next = quantize(clamp(next, min, max), step);
    onChange?.(next);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const p = "touches" in e ? e.touches[0] : e;
      move(p.clientX, p.clientY, e.shiftKey);
    };
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [dragging, min, max, step, onChange]);

  const onDoubleClick = () => {
    if (typeof defaultValue === "number") onChange?.(defaultValue);
  };

  // SVG sizes
  const w = size, h = size;
  const cx = w / 2, cy = h / 2;
  const rTrack = (w * 0.38);
  const rThumb = Math.max(6, Math.floor(w * 0.08));

  const toRad = (deg) => (deg * Math.PI) / 180;

  // arc path for background sweep
  const arc = (startDeg, endDeg, radius) => {
    const large = endDeg - startDeg <= 180 ? 0 : 1;
    const s = toRad(startDeg), e = toRad(endDeg);
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const knobX = cx + rTrack * Math.cos(toRad(angle));
  const knobY = cy + rTrack * Math.sin(toRad(angle));

  return (
    <div
      className={"knob-wrap" + (dragging ? " dragging" : "")}
      style={{ width: size, height: size + 28 }}
      ref={wrapRef}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onDoubleClick={onDoubleClick}
      title="Drag • Shift=Fine • Double-click=Reset"
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* arc bg */}
        <path d={arc(aMin, aMax, rTrack)} className="k-arc-bg" />
        {/* arc value */}
        <path d={arc(aMin, angle, rTrack)} className="k-arc-val" />
        {/* center disc */}
        <circle cx={cx} cy={cy} r={rTrack - 10} className="k-disc" />
        {/* indicator (thumb) */}
        <circle cx={knobX} cy={knobY} r={rThumb} className="k-thumb" />
      </svg>
      <div className="k-meta">
        <div className="k-label">{label}</div>
        <div className="k-value">{format(value)}</div>
      </div>
    </div>
  );
}
