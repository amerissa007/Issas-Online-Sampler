import { useEffect, useMemo, useRef, useState } from "react";
import { buildPeaks } from "../../utils/Peaks";
import "./waveformviewer.css";

export default function WaveformViewer({
  buffer,
  playhead = 0,    
  loopStart = 0,   
  loopEnd = 0      
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(800);

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
    const H = 140;

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const g = canvas.getContext("2d"); 
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.fillStyle = "#0a0c12";
    g.fillRect(0, 0, W, H);

    g.strokeStyle = "#1f2a39";
    g.beginPath();
    g.moveTo(0, H / 2);
    g.lineTo(W, H / 2);
    g.stroke();

    const { width, peaks } = peaksData;
    const scaleX = W / width;
    g.strokeStyle = "#9fb3ff";
    g.lineWidth = 1;
    for (let x = 0; x < width; x++) {
      const [min, max] = peaks[x];
      const y1 = ((1 - max) * 0.5) * H;
      const y2 = ((1 - min) * 0.5) * H;
      const cx = Math.floor(x * scaleX) + 0.5;
      g.beginPath();
      g.moveTo(cx, y1);
      g.lineTo(cx, y2);
      g.stroke();
    }

    if (buffer && loopEnd > loopStart) {
      const ax = (loopStart / buffer.duration) * W;
      const bx = (loopEnd   / buffer.duration) * W;
      const x = Math.max(0, Math.min(W, ax));
      const w = Math.max(1, Math.min(W, bx) - x);
      g.fillStyle = "rgba(36, 232, 165, 0.15)";
      g.fillRect(x, 0, w, H);
      g.fillStyle = "#24e8a5";
      g.fillRect(Math.floor(x), 0, 2, H);
      g.fillRect(Math.floor(x + w), 0, 2, H);
    }

    if (playhead >= 0) {
      const px = Math.max(0, Math.min(W - 1, Math.floor(playhead * W)));
      g.fillStyle = "#24e8a5";
      g.fillRect(px, 0, 2, H);
    }
  }, [peaksData, playhead, loopStart, loopEnd, wrapWidth, buffer]);

  return (
    <div className="waveform-wrap" ref={wrapRef}>
      {!buffer ? (
        <div className="waveform-empty">Load a file to see its waveform.</div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}
