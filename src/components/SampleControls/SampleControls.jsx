import { useMemo } from "react";
import Knob from "../ui/Knob";
import ToggleSwitch from "../ui/ToggleSwitch";
import "./samplecontrols.css";

export default function SampleControls({
  buffer,
  volume, onVolume,
  pan, onPan,
  rate, onRate,
  loopStart, setLoopStart,
  loopEnd, setLoopEnd,
  gate, setGate,
  reverse, setReverse,
  bpm, setBpm,
}) {
  const duration = buffer?.duration ?? 0;
  const loopMax = useMemo(() => (duration > 0 ? duration : 0), [duration]);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmtSecs = (s) => (isFinite(s) ? `${s.toFixed(2)}s` : "—");

  const handleStart = (v) => {
    const t = clamp(parseFloat(v), 0, loopMax);
    setLoopStart(Math.min(t, Math.max(0, loopEnd - 0.01)));
  };
  const handleEnd = (v) => {
    const t = clamp(parseFloat(v), 0, loopMax);
    setLoopEnd(Math.max(t, Math.min(loopMax, loopStart + 0.01)));
  };
  const handleGate = (v) => setGate(clamp(parseFloat(v), 0.05, 1.0));
  const handleBpm  = (v) => setBpm(clamp(parseInt(v, 10), 40, 220));

  return (
    <div className="sample panel">
      <h3>Sample Controls</h3>

      {/* Knobs */}
      <div className="knob-row">
        <Knob label="Volume" value={volume} min={0} max={1} step={0.01}
              defaultValue={0.9} onChange={onVolume} format={(x)=>x.toFixed(2)} />
        <Knob label="Pan" value={pan} min={-1} max={1} step={0.01}
              defaultValue={0} onChange={onPan}
              format={(x)=> (x >= 0 ? `R ${x.toFixed(2)}` : `L ${(-x).toFixed(2)}`)} />
        <Knob label="Rate" value={rate} min={0.25} max={2} step={0.01}
              defaultValue={1} onChange={onRate} format={(x)=>`${x.toFixed(2)}×`} />
      </div>

      {/* Sliders */}
      <div className="transport">
          <label className="slider-label">Reverse</label>
            <ToggleSwitch
              size="md"
              checked={reverse}
              onChange={setReverse}
              // label={reverse ? "On" : "Off"}
            />
        <div className="slider-row">
          <label className="slider-label">Loop Start</label>
          <input
            className="range"
            type="range"
            min={0}
            max={loopMax || 0}
            step={0.01}
            value={clamp(loopStart, 0, loopMax || 0)}
            onChange={(e) => handleStart(e.target.value)}
            disabled={!duration}
          />
          <div className="slider-value">{fmtSecs(loopStart)}</div>
        </div>

        <div className="slider-row">
          <label className="slider-label">Loop End</label>
          <input
            className="range"
            type="range"
            min={0}
            max={loopMax || 0}
            step={0.01}
            value={clamp(loopEnd, 0, loopMax || 0)}
            onChange={(e) => handleEnd(e.target.value)}
            disabled={!duration}
          />
          <div className="slider-value">{fmtSecs(loopEnd)}</div>
        </div>

        <div className="slider-row">
          <label className="slider-label">Gate</label>
          <input
            className="range"
            type="range"
            min={0.05}
            max={1.0}
            step={0.01}
            value={clamp(gate, 0.05, 1.0)}
            onChange={(e) => handleGate(e.target.value)}
          />
          <div className="slider-value">{fmtSecs(gate)}</div>
        </div>

        <div className="slider-row">
          <label className="slider-label">BPM</label>
          <input
            className="range"
            type="range"
            min={40}
            max={220}
            step={1}
            value={clamp(bpm, 40, 220)}
            onChange={(e) => handleBpm(e.target.value)}
          />
          <div className="slider-value">{bpm}</div>
        </div>
      </div>
    </div>
  );
}
