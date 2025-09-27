import { useEffect, useMemo, useRef, useState } from "react";
import { buildPeaks } from "../../utils/Peaks";
import "./waveformviewer.css";

export default function WaveformViewer({
  buffer,
  playhead = 0,
  loopStart = 0,
  loopEnd = 0,
  setLoopStart,
  setLoopEnd,
  slicePoints = [],
  onAddSlice,
  onRemoveSlice,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(800);

  const draggingRef = useRef(null);
  const dragActiveRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const peaksData = useMemo(() => {
    if (!buffer) return null;
    const target = Math.max(300, Math.min(1600, Math.floor(wrapWidth)));
    return buildPeaks(buffer, target);
  }, [buffer, wrapWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaksData) return;

    const dpr = window.devicePixelRatio || 1;
    const W = wrapWidth;
    const H = 160;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.fillStyle = "#0a0c12";
    g.fillRect(0, 0, W, H);

    g.strokeStyle = "#1f2a39";
    g.beginPath(); g.moveTo(0, H/2); g.lineTo(W, H/2); g.stroke();

    const { width, peaks } = peaksData;
    const scaleX = W / width;
    g.strokeStyle = "#9fb3ff";
    g.lineWidth = 1;
    for (let x = 0; x < width; x++) {
      const [min, max] = peaks[x];
      const y1 = ((1 - max) * 0.5) * H;
      const y2 = ((1 - min) * 0.5) * H;
      const cx = Math.floor(x * scaleX) + 0.5;
      g.beginPath(); g.moveTo(cx, y1); g.lineTo(cx, y2); g.stroke();
    }

    if (buffer && loopEnd > loopStart) {
      const a = (loopStart / buffer.duration) * W;
      const b = (loopEnd   / buffer.duration) * W;
      const x = Math.max(0, Math.min(W, a));
      const w = Math.max(1, Math.min(W, b) - x);
      g.fillStyle = "rgba(36, 232, 165, 0.12)";
      g.fillRect(x, 0, w, H);
      g.fillStyle = "#24e8a5";
      g.fillRect(Math.floor(x)-1, 0, 3, H);
      g.fillRect(Math.floor(x+w)-1, 0, 3, H);
    }

    if (buffer && slicePoints?.length) {
      g.fillStyle = "#ffb86c";
      g.strokeStyle = "#ffb86c";
      slicePoints.forEach((t, idx) => {
        const x = Math.max(0, Math.min(W-1, Math.floor((t / buffer.duration) * W)));
        g.fillRect(x, 0, 2, H);
        g.fillStyle = "#0a0c12";
        g.fillRect(x+3, 6, 18, 12);
        g.strokeStyle = "#ffb86c";
        g.strokeRect(x+3, 6, 18, 12);
        g.fillStyle = "#ffb86c";
        g.font = "10px monospace";
        g.fillText(String(idx+1), x+8, 16);
        g.fillStyle = "#ffb86c";
      });
    }

    if (playhead >= 0) {
      const px = Math.max(0, Math.min(W - 1, Math.floor(playhead * W)));
      g.fillStyle = "#24e8a5";
      g.fillRect(px, 0, 2, H);
    }
  }, [peaksData, playhead, loopStart, loopEnd, wrapWidth, buffer, slicePoints]);

  const xToTime = (clientX) => {
    if (!buffer || !wrapRef.current) return 0;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const t = (x / rect.width) * buffer.duration;
    return Math.max(0, Math.min(buffer.duration, t));
  };

  const whichHandleNear = (clientX) => {
    if (!buffer || !wrapRef.current) return null;
    const rect = wrapRef.current.getBoundingClientRect();
    const W = rect.width;
    const xStart = (loopStart / buffer.duration) * W;
    const xEnd   = (loopEnd   / buffer.duration) * W;
    const x = clientX - rect.left;
    const dS = Math.abs(x - xStart);
    const dE = Math.abs(x - xEnd);
    const grab = 10;
    if (dS <= grab && dS <= dE) return "start";
    if (dE <= grab && dE < dS) return "end";
    return null;
  };

  const onMouseDown = (e) => {
    if (!buffer) return;
    if (e.altKey) {
      const t = xToTime(e.clientX);
      onAddSlice?.(t);
      e.preventDefault();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const t = xToTime(e.clientX);
      const rect = wrapRef.current.getBoundingClientRect();
      onRemoveSlice?.(t, 8, rect.width);
      e.preventDefault();
      return;
    }

    const near = whichHandleNear(e.clientX);
    if (near) {
      draggingRef.current = near;
      dragActiveRef.current = true;
      e.preventDefault();
      return;
    }
    const t = xToTime(e.clientX);
    const dToStart = Math.abs(t - loopStart);
    const dToEnd = Math.abs(t - loopEnd);
    const target = dToStart <= dToEnd ? "start" : "end";
    draggingRef.current = target;
    dragActiveRef.current = true;
    if (target === "start") {
      setLoopStart?.(Math.min(t, loopEnd - 0.01));
    } else {
      setLoopEnd?.(Math.max(t, loopStart + 0.01));
    }
  };

  const onMouseMove = (e) => {
    if (!dragActiveRef.current || !buffer) return;
    const t = xToTime(e.clientX);
    const which = draggingRef.current;
    if (which === "start") setLoopStart?.(Math.min(t, loopEnd - 0.01));
    else if (which === "end") setLoopEnd?.(Math.max(t, loopStart + 0.01));
  };

  const endDrag = () => {
    dragActiveRef.current = false;
    draggingRef.current = null;
  };

  useEffect(() => {
    const up = () => endDrag();
    const leave = () => endDrag();
    window.addEventListener("mouseup", up);
    window.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div
      className={"waveform-wrap" + (dragActiveRef.current ? " dragging" : "")}
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      title="Alt/⌥-click = add slice • Ctrl/⌘-click = remove slice • Drag edges = set loop"
    >
      {!buffer ? (
        <div className="waveform-empty">Load a file to see its waveform.</div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
